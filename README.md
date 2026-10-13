# AI Meetup

Live: https://ai-meetup-self.vercel.app

A two-tab community board: code-protected demo submissions and public topics with anonymous upvotes. Built with Next.js, React, Tailwind, Drizzle, and Postgres. Production uses Neon on Vercel.

## Local development

1. Use Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure:
   - `DATABASE_URL`: a local Postgres URL or an isolated Neon development database. Use a pooled Neon URL on Vercel.
   - `DATABASE_URL_UNPOOLED`: Neon direct URL for migrations; optional with local Postgres.
   - `DEMO_CODE`: the shared presenter code, separate from the organizer code.
   - `ADMIN_CODE`: the organizer-only code for deleting entries.
   - `SESSION_SECRET`: at least 32 random characters; generate with `openssl rand -hex 32`.
   - `MEETUP_TIMEZONE`: defaults to `Asia/Bangkok`.
3. Run `npm run db:migrate` then `npm run dev`.
4. Open http://localhost:3000.

Keep production credentials in your deployment environment and use separate development credentials in `.env.local`.

Never commit environment files. Preview/development databases must be separate from production.

## Checks

- `npm test`: validation, signed identity, real Postgres-compatible migration/constraint, concurrent vote, and deletion tests using ephemeral PGlite databases.
- `npm run test:smoke`: HTTP integration against a running local dev server (port 3100, override with `SMOKE_ORIGIN`), using codes from `.env.local`. Creates and cleans up its own entries.
- `npm run typecheck`: TypeScript check.
- `npm run build`: production build (webpack, to avoid local Turbopack subprocess restrictions).
- `npm run format:check`: source formatting.

## Vercel deployment

Confirm the target project with `vercel project inspect --non-interactive` before changing remote resources.

1. Accept Neon Marketplace terms if Vercel requests them. This requires the account owner.
2. Provision Neon on the free plan in Singapore, connecting production only. Create a separate Neon resource for development and preview.
3. Set `DEMO_CODE`, `ADMIN_CODE`, `SESSION_SECRET`, and `MEETUP_TIMEZONE` for each environment. Generate separate secrets for production and non-production.
4. Apply `npm run db:migrate` with the target database URLs in the environment. Migrations prefer `DATABASE_URL_UNPOOLED`. The migration script preserves an already-set `DATABASE_URL` rather than overriding it from `.env.local`.
5. Run tests and build, then `vercel deploy --prod`. This repository does not run migrations at build time.
6. Verify `/demos`, `/topics`, and `/api/board`. Smoke-test submission, votes, and organizer deletion using clearly labeled test entries, then remove those entries.

Deploy with the Vercel CLI, or connect this repository to Vercel to configure automatic deployments.

## Behavior

- Demos: required first name (1–80 characters), valid calendar date and description (1–300 characters). Existing demos without names display “Presenter not recorded”. Shared code is checked server-side. Past demos remain accessible in a collapsed section.
- Topics: mandatory first name (1–80 characters), plain-text description (1–5,000 characters), highest votes first with newest-first ties.
- Votes: a signed, HttpOnly browser cookie lasts one year. A unique database key prevents duplicate votes, including concurrent requests. Clearing cookies or using a different browser allows another vote.
- Organizer sessions: eight hours. Rotating `ADMIN_CODE` invalidates old organizer sessions after redeployment; rotating `SESSION_SECRET` invalidates all signed cookies.
- Deletes are permanent. Deleting a topic cascades to its votes.
- Boards refresh after writes, on focus, and every 15 seconds while visible. Errors retain form text.
- Rate limits are shared across Vercel instances through Postgres: 15 demo attempts per 10 minutes, 30 topic submissions per 10 minutes, 10 admin attempts per 10 minutes, 300 vote operations per minute, per ingress IP. Shared meetup Wi-Fi shares these budgets. Rate-limit IP keys are HMAC-hashed; expired buckets are cleaned during writes.
- All reads are public. Code checks, validation, and deletion authorization happen on the server. Next.js Server Actions provide same-origin mutation checks.

## Schema changes

Update `lib/db/schema.ts`, run `npm run db:generate`, review the SQL, and apply `npm run db:migrate` against development before production. Migration metadata is committed alongside SQL. Never use `db:push` on production.
