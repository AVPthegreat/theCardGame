import { randomUUID } from 'crypto';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export function fail(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

export function newId() {
  return randomUUID();
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
