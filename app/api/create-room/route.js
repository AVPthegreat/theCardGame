import { json, fail, newId, readBody } from '@/lib/http';
import { getRoom, saveRoom } from '@/lib/store';
import { makeCode, sanitizeName, newSeed, publicView } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const body = await readBody(request);
  const name = sanitizeName(body.name);

  // Find a free code (checking Redis).
  let code = null;
  for (let i = 0; i < 6; i++) {
    const candidate = makeCode();
    const existing = await getRoom(candidate);
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) return fail('Could not allocate a room code, please retry', 503);

  const playerId = newId();
  const token = newId();

  const room = {
    code,
    status: 'lobby',
    hostId: playerId,
    seed: newSeed(),
    players: [
      {
        id: playerId,
        token,
        name,
        score: 0,
        connected: true,
        joinedAt: Date.now(),
      },
    ],
    turnOrder: [],
    currentTurnIndex: 0,
    cards: [],
    foundKQJ: { K: false, Q: false, J: false },
    flippedCount: 0,
    winnerIds: [],
    winReason: null,
    lastFlip: null,
    log: [],
    createdAt: Date.now(),
    version: 0,
  };

  await saveRoom(room);

  return json({ ok: true, code, playerId, token, state: publicView(room, playerId) });
}
