import { json, fail } from '@/lib/http';
import { getRoom } from '@/lib/store';
import { publicView } from '@/lib/game';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Read-only poll. No lock needed. Never leaks face-down cards or tokens.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = String(searchParams.get('code') || '').toUpperCase().trim();
  const viewerId = searchParams.get('playerId') || null;
  if (!code) return fail('Missing room code', 400);

  const room = await getRoom(code);
  if (!room) return fail('No room with that code', 404);

  return json({ ok: true, state: publicView(room, viewerId) });
}
