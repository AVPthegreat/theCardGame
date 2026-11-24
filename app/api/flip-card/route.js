import { json, fail, readBody } from '@/lib/http';
import { withRoomLock, saveRoom } from '@/lib/store';
import { applyFlip, currentTurnId, publicView, GRID } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const body = await readBody(request);
  const code = String(body.code || '').toUpperCase().trim();
  const { playerId, token } = body;
  const index = Number(body.index);

  try {
    return await withRoomLock(code, async (room) => {
      if (!room) return fail('No room with that code', 404);

      const actor = room.players.find((p) => p.id === playerId);
      if (!actor || actor.token !== token) return fail('Not authorised', 403);
      if (room.status !== 'playing') return fail('Game is not in progress', 409);

      // Server-side turn enforcement — a client cannot flip out of turn.
      if (currentTurnId(room) !== playerId) return fail('It is not your turn', 403);

      if (!Number.isInteger(index) || index < 0 || index >= GRID) {
        return fail('Invalid card', 400);
      }
      const card = room.cards[index];
      if (!card) return fail('Invalid card', 400);
      if (card.faceUp) return fail('That card is already face up', 409);

      // All scoring / Ace / win logic lives here, on the server.
      const event = applyFlip(room, index, playerId);

      await saveRoom(room);
      return json({ ok: true, event, state: publicView(room, playerId) });
    });
  } catch (e) {
    return fail(e.message || 'Could not flip', e.status || 500);
  }
}
