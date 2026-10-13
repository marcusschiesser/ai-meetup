import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { adminFingerprint, equalSecrets, readToken, signToken } from './tokens';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
const year = 60 * 60 * 24 * 365;
export async function browserIdentity(create = false) {
  const jar = await cookies();
  const existing = readToken(jar.get('meetup_browser')?.value, 'browser');
  if (existing) return existing;
  if (!create) return null;
  const id = randomUUID();
  jar.set(
    'meetup_browser',
    signToken('browser', id, Date.now() + year * 1000),
    { ...cookieOptions, maxAge: year },
  );
  return id;
}
export async function isOrganizer() {
  if (!process.env.ADMIN_CODE) return false;
  const value = readToken(
    (await cookies()).get('meetup_organizer')?.value,
    'organizer',
  );
  return !!value && equalSecrets(value, adminFingerprint());
}
export async function setOrganizer() {
  (await cookies()).set(
    'meetup_organizer',
    signToken('organizer', adminFingerprint(), Date.now() + 8 * 3600_000),
    { ...cookieOptions, maxAge: 8 * 3600 },
  );
}
export async function clearOrganizer() {
  (await cookies()).delete('meetup_organizer');
}
