# CourseFlow

A course scheduler for the University of Victoria — search the catalog, compare sections with live enrollment counts, and build a conflict-free timetable. Live at **[courseflow.smccl.ca](https://courseflow.smccl.ca)**.

Fourth iteration of the project: it started as a Go CLI scraper, grew into a Go + React + MySQL app on a VPS, and was rewritten for Cloudflare's edge to run entirely on the free tier.

## Stack

- TanStack Start + Router + Query
- Cloudflare Workers, D1, and Durable Objects (real-time schedule sharing)
- Biome, TypeScript, Vitest

## Development

```bash
npm ci
npm run d1:migrate:local
npm run d1:seed:csc
npm run dev
```

`npm run check`, `npm run typecheck`, and `npm run test` must pass before deploying with `npm run deploy`.

Course data comes from a Worker-compatible TypeScript importer that ingests the Kuali catalog, Banner timetable sections, and live enrollment counts into D1 — see `npm run catalog:import`.

Secrets are set with `wrangler secret put`, never committed. Non-secret Worker vars live in `wrangler.jsonc`.
