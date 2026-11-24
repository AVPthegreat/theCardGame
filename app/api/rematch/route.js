import { json, fail, readBody } from '@/lib/http';
import { withRoomLock, saveRoom } from '@/lib/store';
import { newSeed, publicView } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Reset a finished room back to the lobby, keeping the same players (scores zeroed).
export async function POST(request) {
  const body = await readBody(request);
  const code = String(body.code || '').toUpperCase().trim();
  const { playerId, token } = body;

  try {
    return await withRoomLock(code, async (room) => {
      if (!room) return fail('No room with that code', 404);
      const actor = room.players.find((p) => p.id === playerId);
      if (!actor || actor.token !== token) return fail('Not authorised', 403);
      if (room.status !== 'finished') return fail('Game is not finished', 409);

      // Only connected players carry into the rematch.
      room.players = room.players.filter((p) => p.connected);
      if (room.players.length === 0) return fail('No players left', 409);
      if (!room.players.some((p) => p.id === room.hostId)) {
        room.hostId = room.players[0].id;
      }
      room.players.forEach((p) => {
        p.score = 0;
      });

      room.status = 'lobby';
      room.seed = newSeed();
      room.cards = [];
      room.turnOrder = [];
      room.currentTurnIndex = 0;
      room.foundKQJ = { K: false, Q: false, J: false };
      room.flippedCount = 0;
      room.lastFlip = null;
      room.log = [];
      room.winnerIds = [];
      room.winReason = null;
      room.finishedAt = null;

      await saveRoom(room);
      return json({ ok: true, state: publicView(room, playerId) });
    });
  } catch (e) {
    return fail(e.message || 'Could not restart', e.status || 500);
  }
}
