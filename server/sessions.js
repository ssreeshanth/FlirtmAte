import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'flirtmate_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function signature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(clientId, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ sub: clientId, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function readSessionToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, supplied, extra] = token.split('.');
  if (!payload || !supplied || extra !== undefined) return null;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof value.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.sub)) return null;
    if (!Number.isInteger(value.exp) || value.exp <= Math.floor(now / 1000)) return null;
    return { clientId: value.sub, expiresAt: value.exp * 1000 };
  } catch {
    return null;
  }
}

export function newSession(secret, now = Date.now()) {
  const clientId = randomUUID();
  return { clientId, token: createSessionToken(clientId, secret, now), expiresAt: now + SESSION_TTL_SECONDS * 1000 };
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function readCookie(req, secret, db, now = Date.now()) {
  const cookieHeader = req.get('cookie') || '';
  const token = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const session = readSessionToken(token, secret, now);
  if (!session) return null;
  const stored = db.prepare('SELECT client_id AS clientId, expires_at AS expiresAt FROM sessions WHERE token_hash = ? AND expires_at > ?').get(hashSessionToken(token), now);
  return stored ? { ...stored, tokenHash: hashSessionToken(token) } : null;
}

export function sessionCookie(token, { secure = true, maxAge = SESSION_TTL_SECONDS } = {}) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie({ secure = true } = {}) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}
