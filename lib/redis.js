import { Redis } from '@upstash/redis';

// Lazy singleton so a production build WITHOUT env vars still succeeds
// (the client is only constructed at request time, never at build time).
let client = null;

export function getRedis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Missing Upstash env vars. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
    );
  }
  client = new Redis({ url, token });
  return client;
}
