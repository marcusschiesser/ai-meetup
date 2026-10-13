import { sql, lt } from 'drizzle-orm';
import { headers } from 'next/headers';
import { getDb } from './db';
import { rateLimits } from './db/schema';
import { privateKey } from './tokens';
export class UserError extends Error {}
export async function rateLimit(
  action: string,
  limit: number,
  seconds: number,
) {
  const h = await headers();
  // Vercel sets this header at its trusted ingress; never trust arbitrary forwarded-for.
  const ip = process.env.VERCEL
    ? h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    : 'local';
  const key = privateKey(`${action}:${ip}`);
  const db = getDb();
  await db
    .delete(rateLimits)
    .where(lt(rateLimits.expiresAt, new Date(Date.now() - 86400_000)));
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, expiresAt: new Date(Date.now() + seconds * 1000) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.expiresAt} <= now() then 1 else ${rateLimits.count} + 1 end`,
        expiresAt: sql`case when ${rateLimits.expiresAt} <= now() then now() + ${seconds} * interval '1 second' else ${rateLimits.expiresAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  if (row.count > limit)
    throw new UserError(
      'Too many attempts. Please try again in a few minutes.',
    );
}
