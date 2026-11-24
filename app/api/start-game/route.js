import { json, fail, readBody } from '@/lib/http';
import { withRoomLock, saveRoom } from '@/lib/store';
import { buildCards, publicView, MIN_PLAYERS } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const body = await readBody(request);
  const code = String(body.code || '').toUpperCase().trim();
  const { playerId, token } = body;

  try {
    return await withRoomLock(code, async (room) => {
      if (!room) return fail('No room with that code', 404);

      const actor = room.players.find((p) => p.id === playerId);
      if (!actor || actor.token !== token) return fail('Not authorised', 403);
      if (room.hostId !== playerId) return fail('Only the host can start the game', 403);
      if (room.status !== 'lobby') return fail('Game already started', 409);

      const active = room.players.filter((p) => p.connected);
      if (active.length < MIN_PLAYERS) {
        return fail('Need at least 2 players to start', 409);
      }

      // Turn order follows join order, restricted to connected players.
      room.turnOrder = active.map((p) => p.id);
      room.currentTurnIndex = 0;
      room.cards = buildCards(room.seed);
      room.foundKQJ = { K: false, Q: false, J: false };
      room.flippedCount = 0;
      room.lastFlip = null;
      room.log = [];
      room.winnerIds = [];
      room.winReason = null;
      room.status = 'playing';
      room.startedAt = Date.now();

      await saveRoom(room);
      return json({ ok: true, state: publicView(room, playerId) });
    });
  } catch (e) {
    return fail(e.message || 'Could not start', e.status || 500);
  }
}
