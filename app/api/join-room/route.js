import { json, fail, newId, readBody } from '@/lib/http';
import { withRoomLock, saveRoom } from '@/lib/store';
import { sanitizeName, publicView, MAX_PLAYERS } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const body = await readBody(request);
  const code = String(body.code || '').toUpperCase().trim();
  const name = sanitizeName(body.name);
  if (!code) return fail('Enter a room code');

  try {
    return await withRoomLock(code, async (room) => {
      if (!room) return fail('No room with that code', 404);
      if (room.status !== 'lobby') {
        return fail('That game has already started', 409);
      }
      if (room.players.length >= MAX_PLAYERS) {
        return fail('That room is full (4 players max)', 409);
      }

      const playerId = newId();
      const token = newId();
      room.players.push({
        id: playerId,
        token,
        name,
        score: 0,
        connected: true,
        joinedAt: Date.now(),
      });

      await saveRoom(room);
      return json({ ok: true, code, playerId, token, state: publicView(room, playerId) });
    });
  } catch (e) {
    return fail(e.message || 'Could not join', e.status || 500);
  }
}
