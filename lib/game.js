// Pure, server-side game logic for "Find the Royals" (KQJ).
// The client NEVER runs this and NEVER receives the identity of a face-down card.

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const GRID = 25; // 5x5 face-down grid
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

export const POINTS = { K: 500, Q: 300, J: 100, A: 1000 };

// --- deterministic RNG (seeded) ---------------------------------------------
// A per-room seed keeps a shuffle reproducible on the server if ever needed,
// without leaking anything to the client.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

// Build the 25-card layout for a room.
// Guarantees: exactly one K, one Q and one J of ONE randomly chosen suit,
// exactly one Ace (the secret jackpot), and 21 non-scoring filler cards
// (ranks 2-10 only, so no stray royal can confuse the board).
export function buildCards(seed) {
  const rng = mulberry32(seed);

  const royalSuit = SUITS[Math.floor(rng() * SUITS.length)];
  const aceSuit = SUITS[Math.floor(rng() * SUITS.length)];

  const scoring = [
    { suit: royalSuit, rank: 'K', points: POINTS.K, scoring: true, ace: false },
    { suit: royalSuit, rank: 'Q', points: POINTS.Q, scoring: true, ace: false },
    { suit: royalSuit, rank: 'J', points: POINTS.J, scoring: true, ace: false },
    { suit: aceSuit, rank: 'A', points: POINTS.A, scoring: true, ace: true },
  ];

  // Filler pool: ranks 2..10 across all suits (36 cards), pick 21 unique.
  const fillerPool = [];
  for (const s of SUITS) {
    for (let r = 2; r <= 10; r++) {
      fillerPool.push({ suit: s, rank: String(r), points: 0, scoring: false, ace: false });
    }
  }
  shuffleInPlace(fillerPool, rng);
  const fillers = fillerPool.slice(0, GRID - scoring.length); // 21

  const cards = shuffleInPlace([...scoring, ...fillers], rng);

  return cards.map((c, index) => ({
    index,
    suit: c.suit,
    rank: c.rank,
    points: c.points,
    scoring: c.scoring,
    ace: c.ace,
    faceUp: false,
    claimedBy: null, // player id
  }));
}

// --- room helpers -----------------------------------------------------------

export function makeCode(exists) {
  // Unambiguous alphabet (no 0/O, 1/I/L).
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    if (!exists || !exists(code)) return code;
  }
  // Fallback: add a 5th char.
  return 'K' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function sanitizeName(name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return clean || 'Player';
}

export function connectedIds(room) {
  return room.turnOrder.filter((id) => {
    const p = room.players.find((pl) => pl.id === id);
    return p && p.connected;
  });
}

// Advance to the next connected player's turn. If nobody else is connected,
// the same player keeps the turn (they can keep flipping solo).
export function advanceTurn(room) {
  const n = room.turnOrder.length;
  if (n === 0) return;
  for (let step = 1; step <= n; step++) {
    const idx = (room.currentTurnIndex + step) % n;
    const id = room.turnOrder[idx];
    const p = room.players.find((pl) => pl.id === id);
    if (p && p.connected) {
      room.currentTurnIndex = idx;
      return;
    }
  }
  // No connected players at all — leave index as-is.
}

export function currentTurnId(room) {
  if (room.status !== 'playing') return null;
  return room.turnOrder[room.currentTurnIndex] ?? null;
}

// Decide winners for a score-based (non-Ace) end: highest total score.
// Ties produce co-winners. All players who earned points are eligible, so a
// player who left still keeps what they claimed.
export function scoreWinners(room) {
  const max = room.players.reduce((m, p) => Math.max(m, p.score), 0);
  return room.players.filter((p) => p.score === max).map((p) => p.id);
}

export function allRoyalsFound(room) {
  return room.foundKQJ.K && room.foundKQJ.Q && room.foundKQJ.J;
}

// Apply a single flip. Assumes validation (turn, face-down, playing) already done.
// Mutates `room` and returns a small event describing what happened.
export function applyFlip(room, index, playerId) {
  const card = room.cards[index];
  const player = room.players.find((p) => p.id === playerId);

  card.faceUp = true;
  card.claimedBy = playerId;
  room.flippedCount = room.cards.filter((c) => c.faceUp).length;

  let gained = 0;
  if (card.scoring) {
    gained = card.points;
    player.score += gained;
  }

  const event = {
    index,
    by: playerId,
    byName: player.name,
    suit: card.suit,
    rank: card.rank,
    points: gained,
    ace: card.ace,
    scoring: card.scoring,
    at: Date.now(),
  };
  room.lastFlip = event;
  room.log = [event, ...(room.log || [])].slice(0, 12);

  if (card.ace) {
    // Jackpot: instant win.
    room.status = 'finished';
    room.winReason = 'ace';
    room.winnerIds = [playerId];
    room.finishedAt = Date.now();
    return event;
  }

  if (card.rank === 'K' || card.rank === 'Q' || card.rank === 'J') {
    room.foundKQJ[card.rank] = true;
  }

  if (allRoyalsFound(room)) {
    room.status = 'finished';
    room.winReason = 'score';
    room.winnerIds = scoreWinners(room);
    room.finishedAt = Date.now();
    return event;
  }

  advanceTurn(room);
  return event;
}

// --- public view -------------------------------------------------------------
// This is the ONLY shape the client ever sees. Face-down cards reveal nothing;
// the Ace's existence is a secret until it is flipped. Tokens are never sent.
export function publicView(room, viewerId) {
  const turnId = currentTurnId(room);
  const turnPlayer = room.players.find((p) => p.id === turnId);

  const winnerNames = (room.winnerIds || [])
    .map((id) => room.players.find((p) => p.id === id)?.name)
    .filter(Boolean);

  return {
    code: room.code,
    status: room.status, // lobby | playing | finished
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      isHost: p.id === room.hostId,
      isYou: p.id === viewerId,
    })),
    turnOrder: room.turnOrder,
    currentTurnId: turnId,
    currentTurnName: turnPlayer ? turnPlayer.name : null,
    yourTurn: !!viewerId && turnId === viewerId,
    cards: room.cards.map((c) =>
      c.faceUp
        ? {
            index: c.index,
            faceUp: true,
            suit: c.suit,
            rank: c.rank,
            points: c.points,
            scoring: c.scoring,
            ace: c.ace,
            claimedBy: c.claimedBy,
            claimedByName: room.players.find((p) => p.id === c.claimedBy)?.name ?? null,
          }
        : { index: c.index, faceUp: false }
    ),
    foundKQJ: room.foundKQJ || { K: false, Q: false, J: false },
    flippedCount: room.flippedCount || 0,
    totalCards: GRID,
    winnerIds: room.winnerIds || [],
    winnerNames,
    winReason: room.winReason || null,
    lastFlip: room.lastFlip || null,
    log: room.log || [],
    version: room.version || 0,
  };
}
