import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function createDb() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured.');
  // Use Neon's pooled connection string on Vercel. Keep per-instance pools small.
  return drizzle(
    postgres(process.env.DATABASE_URL, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    }),
    { schema },
  );
}
let db: ReturnType<typeof createDb> | undefined;
export function getDb() {
  return (db ??= createDb());
}
