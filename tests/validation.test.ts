import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDate,
  demoInput,
  topicInput,
  meetupToday,
} from '../lib/validation';
import { readToken, signToken, equalSecrets } from '../lib/tokens';
process.env.SESSION_SECRET = 'test-only-secret-with-at-least-32-characters';

test('demo validation accepts any real date and rejects impossible dates', () => {
  assert.equal(calendarDate.parse('2028-02-29'), '2028-02-29');
  for (const date of [
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    'not-a-date',
    '0000-01-01',
  ])
    assert.equal(calendarDate.safeParse(date).success, false);
  assert.equal(
    demoInput.safeParse({
      date: '2020-01-01',
      firstName: 'Sam',
      description: ' A past demo ',
      code: '123456',
    }).success,
    true,
  );
  assert.equal(
    demoInput.safeParse({
      date: '2026-10-20',
      firstName: 'Sam',
      description: 'x'.repeat(301),
      code: '123456',
    }).success,
    false,
  );
  assert.equal(
    demoInput.safeParse({
      date: '2026-10-20',
      firstName: 'Sam',
      description: 'A demo',
      code: '',
    }).success,
    false,
  );
});
test('topics require nonblank name and description, enforce limits, preserve newlines', () => {
  for (const input of [
    { firstName: ' ', description: 'hello' },
    { firstName: 'Sam', description: ' ' },
    { firstName: 'x'.repeat(81), description: 'hello' },
    { firstName: 'Sam', description: 'x'.repeat(5001) },
  ])
    assert.equal(topicInput.safeParse(input).success, false);
  assert.deepEqual(
    topicInput.parse({ firstName: ' Sam ', description: ' one\ntwo ' }),
    { firstName: 'Sam', description: 'one\ntwo' },
  );
});
test('meetup dates use Bangkok calendar day across UTC midnight boundaries', () => {
  assert.equal(
    meetupToday(new Date('2026-10-12T18:00:00Z'), 'Asia/Bangkok'),
    '2026-10-13',
  );
  assert.equal(
    meetupToday(new Date('2026-10-12T16:00:00Z'), 'Asia/Bangkok'),
    '2026-10-12',
  );
});
test('signed identities cannot be forged, repurposed, or reused after expiry', () => {
  const token = signToken('browser', 'browser-id', 10000);
  assert.equal(readToken(token, 'browser', 9999), 'browser-id');
  assert.equal(readToken(token, 'organizer', 9999), null);
  assert.equal(readToken(token, 'browser', 10000), null);
  assert.equal(readToken(token + 'x', 'browser', 9999), null);
  assert.equal(readToken('malformed', 'browser'), null);
  assert.equal(equalSecrets('code', 'code'), true);
  assert.equal(equalSecrets('code', 'other'), false);
});

test('new demos require a first name and trim it', () => {
  const demo = { date: '2026-10-20', description: 'A demo', code: '123456' };
  for (const firstName of [undefined, '', '   ', 'x'.repeat(81)]) {
    assert.equal(demoInput.safeParse({ ...demo, firstName }).success, false);
  }
  assert.equal(
    demoInput.parse({ ...demo, firstName: ' Sam ' }).firstName,
    'Sam',
  );
});
