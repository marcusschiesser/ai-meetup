import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  primaryKey,
  integer,
  check,
  index,
} from 'drizzle-orm/pg-core';

export const demos = pgTable(
  'demos',
  {
    id: uuid().defaultRandom().primaryKey(),
    date: date().notNull(),
    // Older demos have no recorded presenter; new submissions require a name.
    firstName: text('first_name'),
    description: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      'demo_name_length',
      sql`${t.firstName} is null or length(trim(${t.firstName})) between 1 and 80`,
    ),
    check(
      'demo_description_length',
      sql`length(trim(${t.description})) between 1 and 300`,
    ),
    index('demos_date_idx').on(t.date),
  ],
);

export const topics = pgTable(
  'topics',
  {
    id: uuid().defaultRandom().primaryKey(),
    firstName: text('first_name').notNull(),
    description: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      'topic_name_length',
      sql`length(trim(${t.firstName})) between 1 and 80`,
    ),
    check(
      'topic_description_length',
      sql`length(trim(${t.description})) between 1 and 5000`,
    ),
  ],
);

export const votes = pgTable(
  'votes',
  {
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    browserId: uuid('browser_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.topicId, t.browserId] })],
);

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text().primaryKey(),
    count: integer().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('rate_limits_expiry_idx').on(t.expiresAt)],
);
