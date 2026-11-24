'use client';

// --- local credential storage (per room) -----------------------------------
const key = (code) => `kqj:cred:${String(code).toUpperCase()}`;

export function saveCred(code, cred) {
  try {
    localStorage.setItem(key(code), JSON.stringify(cred));
  } catch {
    /* storage may be blocked; game still works for this tab via state */
  }
}

export function loadCred(code) {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCred(code) {
  try {
    localStorage.removeItem(key(code));
  } catch {
    /* ignore */
  }
}

// --- API calls --------------------------------------------------------------
async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ ok: false, error: 'Bad response' }));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  createRoom: (name) => post('/api/create-room', { name }),
  joinRoom: (code, name) => post('/api/join-room', { code, name }),
  startGame: (code, playerId, token) => post('/api/start-game', { code, playerId, token }),
  flipCard: (code, playerId, token, index) =>
    post('/api/flip-card', { code, playerId, token, index }),
  rematch: (code, playerId, token) => post('/api/rematch', { code, playerId, token }),
  leaveRoom: (code, playerId, token) => post('/api/leave-room', { code, playerId, token }),
  async getState(code, playerId) {
    const params = new URLSearchParams({ code });
    if (playerId) params.set('playerId', playerId);
    const res = await fetch(`/api/get-state?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({ ok: false, error: 'Bad response' }));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Could not load game');
    return data;
  },
};

// --- card display helpers ---------------------------------------------------
export const SUIT_SYMBOL = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function isRedSuit(suit) {
  return suit === 'hearts' || suit === 'diamonds';
}

export function rankLabel(rank) {
  return rank;
}

const AVATAR_COLORS = [
  'linear-gradient(180deg,#ffd97a,#d99a2b)',
  'linear-gradient(180deg,#8fd6ff,#2b7fd9)',
  'linear-gradient(180deg,#ffb0c4,#d6435a)',
  'linear-gradient(180deg,#a7f0c0,#2bb673)',
];

export function avatarStyle(index) {
  return { background: AVATAR_COLORS[index % AVATAR_COLORS.length] };
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
