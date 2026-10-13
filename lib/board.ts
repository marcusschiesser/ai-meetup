import { asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from './db';
import { demos, topics, votes } from './db/schema';
import { browserIdentity, isOrganizer } from './auth';
import { meetupToday } from './validation';
import type { Board } from './types';
export async function readBoard(): Promise<Board> {
  const db = getDb();
  const [browser, organizer] = await Promise.all([
    browserIdentity(),
    isOrganizer(),
  ]);
  const voteCount = sql<number>`count(${votes.browserId})::int`;
  const [demoRows, topicRows] = await Promise.all([
    db.select().from(demos).orderBy(asc(demos.date), asc(demos.createdAt)),
    db
      .select({
        id: topics.id,
        firstName: topics.firstName,
        description: topics.description,
        createdAt: topics.createdAt,
        voteCount,
        voted: sql<boolean>`coalesce(bool_or(${votes.browserId} = ${browser}::uuid), false)`,
      })
      .from(topics)
      .leftJoin(votes, eq(topics.id, votes.topicId))
      .groupBy(topics.id)
      .orderBy(desc(voteCount), desc(topics.createdAt), asc(topics.id)),
  ]);
  return {
    demos: demoRows.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    topics: topicRows.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    organizer,
    today: meetupToday(),
  };
}
