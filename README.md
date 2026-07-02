# CourseFlow

CourseFlow is a course scheduler for the University of Victoria — search the catalog, compare sections with live enrollment counts, and build a conflict-free timetable. It runs at **[courseflow.smccl.ca](https://courseflow.smccl.ca)**.

This is the fourth iteration of the project. It started as a Go CLI scraper, grew into a Go + React + MySQL app on a DigitalOcean VPS, and was rewritten for Cloudflare's edge so it can run entirely on the free tier.

## Stack

- TanStack Start + Router + Query
- Cloudflare Workers via `@cloudflare/vite-plugin`
- Cloudflare D1 for course catalog, sections, saved schedules, and course connections
- Durable Objects for real-time schedule sharing
- Biome, TypeScript, Vitest

## Local setup

```bash
npm ci
npm run d1:migrate:local
npm run d1:seed:csc
npm run dev
```

Useful checks:

```bash
npm run check
npm run typecheck
npm run test
```

## Catalog import

The Worker-compatible TypeScript importer fetches the Kuali course catalog, Banner timetable sections, and live enrollment counts, then writes D1 upsert SQL through Wrangler.

```bash
# Smoke test a small local import without writing D1
npm run catalog:import -- --term 202609 --subject CSC --limit 5 --dry-run

# Import a term locally
npm run catalog:import:local -- --term 202609 --subject CSC

# Import a term into production D1
npm run catalog:import:prod -- --term 202609
```

Useful flags:

- `--subject CSC,SENG` limits the import to specific subject prefixes.
- `--limit 25` imports only the first selected courses.
- `--skip-enrollment` imports timetable data without live enrollment counts.
- `--concurrency 4` controls course/section fetch concurrency.

The full course index lives at `data/import/courses.json`. Import reports and generated SQL are written under `.wrangler/tmp/`.

## Database

The D1 binding is `DB` and is configured in `wrangler.jsonc`.

Current production database:

- name: `course-flow-v4`
- binding: `DB`
- migrations directory: `migrations/`

Commands:

```bash
npm run d1:info
npm run d1:migrate:local
npm run d1:migrate:prod
npm run d1:seed:csc:local
npm run d1:seed:csc:prod
npm run d1:backup:prod
```

Add schema changes as new numbered SQL files in `migrations/`; never edit migrations that may already be recorded in D1's `d1_migrations` table.

## Production deploy

```bash
npm run check
npm run typecheck
npm run test
npm run d1:migrate:prod
npm run deploy:dry-run
npm run deploy
```

After deploy, verify:

```bash
curl https://courseflow.smccl.ca/api/v1/health
```

If recreating D1 from scratch, create the database and copy the returned UUID into `wrangler.jsonc`:

```bash
npx wrangler d1 create course-flow-v4 --location wnam
npx wrangler types
```

Secrets should be set with `wrangler secret put`; do not commit secret values. Non-secret Worker vars live in `wrangler.jsonc`.

### Feedback

Anonymous feedback is submitted to a Discord webhook. Configure the webhook URL as a secret:

```bash
npx wrangler secret put DISCORD_FEEDBACK_WEBHOOK_URL
```

If unset, the `submitFeedback` server function returns `503` and the popover surfaces a toast. Each submission includes the user's message, optional mood emoji, page path, search params, full scheduler snapshot (term, courses, sections, derived calendar events), and a client metadata blob (UA, viewport, timezone, connection, etc.) — no user identity is collected.

## API endpoints

- `GET /api/v1/health`
- `GET /api/v1/courses/search?q=<query>&term=<term>`
- `GET /api/v1/courses/code/$subjectCode`
- `GET /api/v1/courses/subjects?term=<term>`
- `GET /api/v1/sections/$pid/$term`
- `GET /api/v1/sections/by-crns/$term?crns=12345,67890`
