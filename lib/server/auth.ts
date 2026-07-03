// ─── Server-only auth ─────────────────────────────────────────────────────────
// A minimal stateless token: base64url(payload).base64url(HMAC-SHA256(payload)).
// Payload = { slug, exp }. Signed with AUTH_SECRET (server-only). This is an MVP
// scheme — good enough to gate the owner dashboard, not a full identity system.

import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET ?? '';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TokenPayload {
  slug: string;
  exp: number; // epoch ms
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(payloadB64: string): string {
  return b64url(crypto.createHmac('sha256', SECRET).update(payloadB64).digest());
}

/** Issue a signed token for a restaurant slug. */
export function issueToken(slug: string): string {
  if (!SECRET) throw new Error('AUTH_SECRET not configured.');
  const payload: TokenPayload = { slug, exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verify a token; returns the payload or null if invalid/expired/tampered. */
export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!SECRET || !token) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  // Constant-time compare — both are equal-length hex/b64url strings.
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    ) as TokenPayload;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract and verify a Bearer token from a request, and confirm it is scoped to
 * the given slug. Returns true when authorised.
 */
export function isAuthorized(authHeader: string | undefined, slug: string): boolean {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  return !!payload && payload.slug === slug;
}
