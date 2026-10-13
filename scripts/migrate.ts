import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
config({ path: '.env.local', quiet: true });
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const connection = postgres(
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    {
      max: 1,
      prepare: false,
    },
  );
  try {
    await migrate(drizzle(connection), { migrationsFolder: './drizzle' });
    console.log('Database migrations applied.');
  } finally {
    await connection.end();
  }
}
main().catch(() => {
  console.error(
    'Migration failed. Check DATABASE_URL and database connectivity.',
  );
  process.exitCode = 1;
});
