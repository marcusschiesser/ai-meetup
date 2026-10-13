import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return value;
}
export function equalSecrets(a: string, b: string) {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
}
export function signToken(purpose: string, value: string, expires: number) {
  const payload = Buffer.from(
    JSON.stringify({ purpose, value, expires }),
  ).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function readToken(
  token: string | undefined,
  purpose: string,
  now = Date.now(),
): string | null {
  if (!token || token.length > 2048) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', secret())
    .update(payload)
    .digest('base64url');
  if (!equalSecrets(signature, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return parsed.purpose === purpose &&
      typeof parsed.value === 'string' &&
      typeof parsed.expires === 'number' &&
      parsed.expires > now
      ? parsed.value
      : null;
  } catch {
    return null;
  }
}
export function adminFingerprint() {
  return createHmac('sha256', secret())
    .update(process.env.ADMIN_CODE || '')
    .digest('hex');
}
export function privateKey(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}
