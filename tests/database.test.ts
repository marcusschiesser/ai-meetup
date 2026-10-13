import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq, sql } from 'drizzle-orm';
import { demos, topics, votes, rateLimits } from '../lib/db/schema';

test('Postgres migration, concurrent vote uniqueness, undo, foreign keys, and cascade deletion', async () => {
  const pg = new PGlite();
  try {
    const journal = JSON.parse(
      await readFile('drizzle/meta/_journal.json', 'utf8'),
    );
    for (const entry of journal.entries)
      await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, 'utf8'));
    const db = drizzle(pg);
    const [topic] = await db
      .insert(topics)
      .values({
        firstName: 'Sam',
        description: 'How do we evaluate agents?\nLet’s compare.',
      })
      .returning();
    const browserId = randomUUID();
    await Promise.all(
      Array.from({ length: 12 }, () =>
        db
          .insert(votes)
          .values({ topicId: topic.id, browserId })
          .onConflictDoNothing(),
      ),
    );
    assert.equal((await db.select().from(votes)).length, 1);
    await db
      .insert(votes)
      .values({ topicId: topic.id, browserId: randomUUID() });
    assert.equal((await db.select().from(votes)).length, 2);
    await db
      .delete(votes)
      .where(and(eq(votes.topicId, topic.id), eq(votes.browserId, browserId)));
    await db
      .delete(votes)
      .where(and(eq(votes.topicId, topic.id), eq(votes.browserId, browserId)));
    assert.equal((await db.select().from(votes)).length, 1);
    await assert.rejects(
      db.insert(votes).values({ topicId: randomUUID(), browserId }),
    );
    await assert.rejects(
      db.insert(topics).values({ firstName: ' ', description: 'A topic' }),
    );
    await assert.rejects(
      db
        .insert(demos)
        .values({ date: '2026-02-30', description: 'No such day' }),
    );
    await assert.rejects(
      db
        .insert(demos)
        .values({ date: '2026-10-20', description: 'x'.repeat(301) }),
    );
    await db.delete(topics).where(eq(topics.id, topic.id));
    assert.equal((await db.select().from(votes)).length, 0);
  } finally {
    await pg.close();
  }
});
test('database rate-limit upserts count concurrent attempts without lost updates', async () => {
  const pg = new PGlite();
  try {
    const journal = JSON.parse(
      await readFile('drizzle/meta/_journal.json', 'utf8'),
    );
    for (const entry of journal.entries)
      await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, 'utf8'));
    const db = drizzle(pg);
    await Promise.all(
      Array.from({ length: 20 }, () =>
        db
          .insert(rateLimits)
          .values({
            key: 'test',
            count: 1,
            expiresAt: new Date(Date.now() + 60000),
          })
          .onConflictDoUpdate({
            target: rateLimits.key,
            set: { count: sql`${rateLimits.count} + 1` },
          }),
      ),
    );
    assert.equal((await db.select().from(rateLimits))[0].count, 20);
  } finally {
    await pg.close();
  }
});

test('presenter migration preserves old demos and validates recorded names', async () => {
  const pg = new PGlite();
  try {
    const journal = JSON.parse(
      await readFile('drizzle/meta/_journal.json', 'utf8'),
    );
    await pg.exec(
      await readFile(`drizzle/${journal.entries[0].tag}.sql`, 'utf8'),
    );
    await pg.exec(
      "INSERT INTO demos (date, description) VALUES ('2026-10-20', 'Existing demo')",
    );
    for (const entry of journal.entries.slice(1))
      await pg.exec(await readFile(`drizzle/${entry.tag}.sql`, 'utf8'));
    const db = drizzle(pg);
    assert.equal((await db.select().from(demos))[0].firstName, null);
    const [demo] = await db
      .insert(demos)
      .values({ date: '2026-10-20', description: 'New demo', firstName: 'Sam' })
      .returning();
    assert.equal(demo.firstName, 'Sam');
    for (const firstName of [' ', 'x'.repeat(81)])
      await assert.rejects(
        db.insert(demos).values({
          date: '2026-10-20',
          description: 'Invalid name',
          firstName,
        }),
      );
  } finally {
    await pg.close();
  }
});
