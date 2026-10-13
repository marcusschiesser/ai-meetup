import { z } from 'zod';

export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.')
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value &&
      value >= '0001-01-01'
    );
  }, 'Choose a valid date.');
export const demoInput = z.object({
  date: calendarDate,
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter your first name.')
    .max(80, 'Keep your name under 81 characters.'),
  description: z
    .string()
    .trim()
    .min(1, 'Add a short description.')
    .max(300, 'Keep the description under 301 characters.'),
  code: z.string().trim().min(1, 'Enter the demo code.').max(128),
});
export const topicInput = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter your first name.')
    .max(80, 'Keep your name under 81 characters.'),
  description: z
    .string()
    .trim()
    .min(1, 'Add a topic description.')
    .max(5000, 'Keep your description under 5,001 characters.'),
});
export const idInput = z.string().uuid();
export function meetupToday(
  now = new Date(),
  timezone = process.env.MEETUP_TIMEZONE || 'Asia/Bangkok',
) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
