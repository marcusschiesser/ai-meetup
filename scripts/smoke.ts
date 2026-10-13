import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
config({ path: '.env.local', quiet: true });

async function main() {
  const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3100';
  if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
    throw new Error('Smoke tests are restricted to a local test server.');
  await fetch(`${origin}/topics`);
  const manifest = JSON.parse(
    await readFile('.next/dev/server/server-reference-manifest.json', 'utf8'),
  );
  const ids = Object.fromEntries(
    Object.entries(manifest.node).map(([id, entry]) => [
      (entry as { exportedName: string }).exportedName,
      id,
    ]),
  );
  const jar = new Map<string, string>();
  function capture(response: Response) {
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0];
      const split = pair.indexOf('=');
      jar.set(pair.slice(0, split), pair.slice(split + 1));
    }
  }
  function cookie() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async function board() {
    const response = await fetch(`${origin}/api/board`, {
      headers: { Cookie: cookie() },
    });
    capture(response);
    assert.equal(response.status, 200);
    return response.json();
  }
  async function action(name: string, ...args: unknown[]) {
    assert.ok(ids[name], `Missing ${name} action`);
    const response = await fetch(`${origin}/topics`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookie(),
        'Next-Action': ids[name],
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify(args),
    });
    capture(response);
    const body = await response.text();
    const match = body.match(/^\w+:(\{"ok":.*\})$/m);
    assert.ok(match, `No action result from ${name} (HTTP ${response.status})`);
    return JSON.parse(match[1]);
  }
  const label = `Smoke ${Date.now()}`;
  const cleanup: Array<['demo' | 'topic', string]> = [];
  try {
    await board();
    const missingName = await action('addDemo', {
      date: '2027-10-20',
      description: label,
      code: process.env.DEMO_CODE,
    });
    assert.equal(missingName.ok, false);
    assert.ok(missingName.fields?.firstName);
    assert.equal(
      (await action('addTopic', { firstName: ' ', description: label })).ok,
      false,
    );
    assert.equal(
      (
        await action('addDemo', {
          date: '2027-10-20',
          firstName: 'Smoke',
          description: label,
          code: 'wrong-code',
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await action('addTopic', {
          firstName: 'Smoke',
          description: label + '\nLine two.',
        })
      ).ok,
      true,
    );
    let data = await board();
    const topic = data.topics.find((t: { description: string }) =>
      t.description.startsWith(label),
    );
    assert.ok(topic);
    cleanup.push(['topic', topic.id]);
    assert.equal((await action('deleteEntry', 'topic', topic.id)).ok, false);
    const repeated = await Promise.all(
      Array.from({ length: 8 }, () => action('setVote', topic.id, true)),
    );
    assert.ok(repeated.every((r) => r.ok));
    data = await board();
    let voted = data.topics.find((t: { id: string }) => t.id === topic.id);
    assert.equal(voted.voteCount, 1);
    assert.equal(voted.voted, true);
    assert.equal((await action('setVote', topic.id, false)).ok, true);
    data = await board();
    voted = data.topics.find((t: { id: string }) => t.id === topic.id);
    assert.equal(voted.voteCount, 0);
    assert.equal(
      (
        await action('addDemo', {
          date: '2027-10-20',
          firstName: 'Smoke',
          description: label,
          code: process.env.DEMO_CODE,
        })
      ).ok,
      true,
    );
    data = await board();
    const demo = data.demos.find(
      (d: { description: string }) => d.description === label,
    );
    assert.ok(demo);
    cleanup.push(['demo', demo.id]);
    assert.equal(demo.firstName, 'Smoke');
    assert.equal((await action('organizerLogin', 'wrong-admin')).ok, false);
    assert.equal(
      (await action('organizerLogin', process.env.ADMIN_CODE)).ok,
      true,
    );
    assert.equal((await board()).organizer, true);
    for (const [kind, id] of cleanup)
      assert.equal((await action('deleteEntry', kind, id)).ok, true);
    cleanup.length = 0;
    assert.equal((await action('organizerLogout')).ok, true);
    assert.equal((await board()).organizer, false);
    assert.equal((await action('deleteEntry', 'topic', topic.id)).ok, false);
    console.log(
      'HTTP smoke passed: validation, demo code, public topics, concurrent votes, undo, organizer login/logout, authorized deletion, unauthorized deletion.',
    );
  } finally {
    if (cleanup.length) {
      await action('organizerLogin', process.env.ADMIN_CODE);
      for (const [kind, id] of cleanup) await action('deleteEntry', kind, id);
    }
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
