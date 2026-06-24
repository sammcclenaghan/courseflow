# CourseFlow v4

CourseFlow is a UVic course scheduler being ported to Cloudflare Workers and the TanStack ecosystem.

## Stack

- TanStack Start + Router + Query
- Cloudflare Workers via `@cloudflare/vite-plugin`
- Cloudflare D1 for course catalog, sections, saved schedules, and course connections
- Biome, TypeScript, Vitest

## Local setup

```bash
nub ci
nub run d1:migrate:local
nub run d1:seed:csc
nub run dev
```

Useful checks:

```bash
nub run check
nub run typecheck
nub run test
```

## Catalog import

The Worker-compatible TypeScript importer fetches the Kuali course catalog, Banner timetable sections, and live enrollment counts, then writes D1 upsert SQL through Wrangler.

```bash
# Smoke test a small local import without writing D1
nub run catalog:import -- --term 202609 --subject CSC --limit 5 --dry-run

# Import a term locally
nub run catalog:import:local -- --term 202609 --subject CSC

# Import a term into production D1
nub run catalog:import:prod -- --term 202609
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
nub run d1:info
nub run d1:migrate:local
nub run d1:migrate:prod
nub run d1:seed:csc:local
nub run d1:seed:csc:prod
nub run d1:backup:prod
```

Add schema changes as new numbered SQL files in `migrations/`; never edit migrations that may already be recorded in D1's `d1_migrations` table.

## Production deploy

```bash
nub run check
nub run typecheck
nub run test
nub run d1:migrate:prod
nub run deploy:dry-run
nub run deploy
```

After deploy, verify:

```bash
curl https://course-flow-v4.sam-238.workers.dev/api/v1/health
```

If recreating D1 from scratch, create the database and copy the returned UUID into `wrangler.jsonc`:

```bash
nub exec wrangler d1 create course-flow-v4 --location wnam
nub exec wrangler types
```

Secrets should be set with `wrangler secret put`; do not commit secret values. Non-secret Worker vars live in `wrangler.jsonc`.

## API endpoints

- `GET /api/v1/health`
- `GET /api/v1/courses/search?q=<query>&term=<term>`
- `GET /api/v1/courses/code/$subjectCode`
- `GET /api/v1/courses/subjects?term=<term>`
- `GET /api/v1/sections/$pid/$term`
- `GET /api/v1/sections/by-crns/$term?crns=12345,67890`
