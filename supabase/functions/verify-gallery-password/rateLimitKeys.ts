// Pure helpers for the gallery password rate limiter.
// Kept separate from index.ts so tests can import them without booting a server.

/** HMAC-SHA256 hex digest of `value` using the server-only pepper. */
export async function hmacKey(pepper: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Trusted client IP. Only gateway-supplied headers are consulted — never the
 * request body or query string.
 */
export function trustedIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0]?.trim();
  return first || headers.get('cf-connecting-ip') || headers.get('x-real-ip') || 'unknown';
}
