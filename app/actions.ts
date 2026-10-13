'use server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { demos, topics, votes } from '@/lib/db/schema';
import {
  browserIdentity,
  isOrganizer,
  setOrganizer,
  clearOrganizer,
} from '@/lib/auth';
import { equalSecrets } from '@/lib/tokens';
import { demoInput, topicInput, idInput } from '@/lib/validation';
import { rateLimit, UserError } from '@/lib/rate-limit';
import type { ActionResult } from '@/lib/types';

async function attempt(work: () => Promise<void>): Promise<ActionResult> {
  try {
    await work();
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        ok: false,
        error: 'Please check the highlighted fields.',
        fields: Object.fromEntries(
          error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      };
    if (error instanceof UserError) return { ok: false, error: error.message };
    console.error(
      'Meetup operation failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return { ok: false, error: 'We couldn’t save that. Please try again.' };
  }
}
export async function addDemo(input: unknown) {
  return attempt(async () => {
    const data = demoInput.parse(input);
    await rateLimit('demo', 15, 600);
    if (
      !process.env.DEMO_CODE ||
      !equalSecrets(data.code, process.env.DEMO_CODE)
    )
      throw new UserError(
        'That demo code isn’t right. Ask the organizer for the code.',
      );
    await getDb().insert(demos).values({
      date: data.date,
      firstName: data.firstName,
      description: data.description,
    });
  });
}
export async function addTopic(input: unknown) {
  return attempt(async () => {
    const data = topicInput.parse(input);
    await rateLimit('topic', 30, 600);
    await getDb().insert(topics).values(data);
  });
}
export async function setVote(id: string, wanted: boolean) {
  return attempt(async () => {
    idInput.parse(id);
    z.boolean().parse(wanted);
    await rateLimit('vote', 300, 60);
    const browserId = (await browserIdentity(true))!;
    const db = getDb();
    const [topic] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.id, id))
      .limit(1);
    if (!topic)
      throw new UserError('This topic was removed. Refresh the board.');
    if (wanted)
      await db
        .insert(votes)
        .values({ topicId: id, browserId })
        .onConflictDoNothing();
    else
      await db
        .delete(votes)
        .where(and(eq(votes.topicId, id), eq(votes.browserId, browserId)));
  });
}
export async function organizerLogin(input: unknown) {
  return attempt(async () => {
    const code = z.string().trim().min(1).max(128).parse(input);
    await rateLimit('admin', 10, 600);
    if (!process.env.ADMIN_CODE || !equalSecrets(code, process.env.ADMIN_CODE))
      throw new UserError('That organizer code isn’t right. Please try again.');
    await setOrganizer();
  });
}
export async function organizerLogout() {
  return attempt(clearOrganizer);
}
export async function deleteEntry(kind: 'demo' | 'topic', id: string) {
  return attempt(async () => {
    if (!(await isOrganizer()))
      throw new UserError(
        'Your organizer session has expired. Please sign in again.',
      );
    idInput.parse(id);
    z.enum(['demo', 'topic']).parse(kind);
    const table = kind === 'demo' ? demos : topics;
    await getDb().delete(table).where(eq(table.id, id));
  });
}
