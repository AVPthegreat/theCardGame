import { json, fail, readBody } from '@/lib/http';
import { withRoomLock, saveRoom } from '@/lib/store';
import { currentTurnId, advanceTurn, allRoyalsFound, scoreWinners, publicView } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const body = await readBody(request);
  const code = String(body.code || '').toUpperCase().trim();
  const { playerId, token } = body;

  try {
    return await withRoomLock(code, async (room) => {
      if (!room) return json({ ok: true }); // already gone

      const actor = room.players.find((p) => p.id === playerId);
      if (!actor || actor.token !== token) return fail('Not authorised', 403);

      if (room.status === 'lobby') {
        // Remove entirely from the lobby.
        room.players = room.players.filter((p) => p.id !== playerId);
        if (room.players.length === 0) {
          // Nobody left; let the room expire.
          await saveRoom(room);
          return json({ ok: true });
        }
        if (room.hostId === playerId) {
          room.hostId = room.players[0].id; // promote next player
        }
        await saveRoom(room);
        return json({ ok: true });
      }

      // Mid-game: mark disconnected but keep their claimed cards/score.
      actor.connected = false;
      const wasTheirTurn = currentTurnId(room) === playerId;
      if (wasTheirTurn) advanceTurn(room);

      // If this leaves nobody connected, end the game on current scores.
      const anyConnected = room.players.some((p) => p.connected);
      if (!anyConnected && room.status === 'playing') {
        room.status = 'finished';
        room.winReason = allRoyalsFound(room) ? 'score' : 'abandoned';
        room.winnerIds = scoreWinners(room);
        room.finishedAt = Date.now();
      }

      await saveRoom(room);
      return json({ ok: true, state: publicView(room, playerId) });
    });
  } catch (e) {
    return fail(e.message || 'Could not leave', e.status || 500);
  }
}
