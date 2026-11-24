import { getRedis } from './redis';

const TTL_SECONDS = 60 * 60 * 6; // rooms self-expire after 6 hours of inactivity
const LOCK_MS = 4000;

const roomKey = (code) => `kqj:room:${String(code).toUpperCase()}`;
const lockKey = (code) => `kqj:lock:${String(code).toUpperCase()}`;

export async function getRoom(code) {
  if (!code) return null;
  const redis = getRedis();
  const data = await redis.get(roomKey(code));
  return data || null; // @upstash/redis parses JSON automatically
}

export async function saveRoom(room) {
  const redis = getRedis();
  room.version = (room.version || 0) + 1;
  room.updatedAt = Date.now();
  await redis.set(roomKey(room.code), room, { ex: TTL_SECONDS });
  return room;
}

export async function roomExists(code) {
  const redis = getRedis();
  const n = await redis.exists(roomKey(code));
  return n === 1;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A tiny per-room lock so two near-simultaneous mutations (two clients acting
// on the same turn-change poll) can't both read-modify-write and clobber state.
async function acquireLock(code) {
  const redis = getRedis();
  for (let i = 0; i < 40; i++) {
    const ok = await redis.set(lockKey(code), '1', { nx: true, px: LOCK_MS });
    if (ok === 'OK' || ok === true) return true;
    await sleep(80);
  }
  return false;
}

async function releaseLock(code) {
  try {
    await getRedis().del(lockKey(code));
  } catch {
    // lock will expire on its own
  }
}

// Run a read-modify-write mutation under the room lock.
export async function withRoomLock(code, mutator) {
  const got = await acquireLock(code);
  if (!got) {
    const err = new Error('Room is busy, try again');
    err.status = 409;
    throw err;
  }
  try {
    const room = await getRoom(code);
    return await mutator(room);
  } finally {
    await releaseLock(code);
  }
}
