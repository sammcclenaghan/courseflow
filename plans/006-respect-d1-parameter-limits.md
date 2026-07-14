# Plan 006: Support 100 CRNs within D1 free-tier limits

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and said they maintain the
> index.
>
> **Drift check (run first)**: `git diff --stat ca00dbd..HEAD -- src/utils/scheduler-shared.ts src/utils/scheduler-db.server.ts src/utils/sections-db.server.ts src/utils/d1-query-limits.ts src/utils/d1-query-limits.test.ts src/utils/sections-by-crns.server.ts src/utils/sections-by-crns.server.test.ts src/utils/schedule-write-statements.ts src/utils/schedule-write-statements.test.ts src/utils/scheduler.test.ts src/routes/api/v1/sections/by-crns/'$'term.ts plans/README.md`
> If D1's documented limits or the repository's 100-CRN product limit changed,
> stop and recalculate both lookup and write capacities before editing.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ca00dbd`, 2026-07-13

## Why this matters

CourseFlow explicitly accepts schedules and API requests containing 100 CRNs.
Current lookups bind one term plus 100 CRNs, exceeding D1's documented 100 bound-
parameter maximum. Saving the same valid schedule also creates two fixed batch
statements plus one insert per CRN—102 statements—while D1 Free permits 50
queries per Worker invocation. Keep the public 100-CRN contract, but chunk reads
and combine inserts so the complete save path fits both platform limits.

## Current state

- `src/utils/scheduler-shared.ts:1,30-32` accepts exactly 100 and rejects 101:

  ```ts
  export const MAX_SCHEDULE_CRNS = 100;
  if (crns.length > MAX_SCHEDULE_CRNS) {
    throw new ScheduleRequestError("too many CRNs requested", 400);
  }
  ```

- `src/utils/scheduler-db.server.ts:370-381` binds `term, ...crns` in one query,
  which is 101 parameters at the accepted boundary.
- `src/routes/api/v1/sections/by-crns/$term.ts:5,24-35` independently allows 100
  and repeats the same unsafe query.
- `src/utils/scheduler-db.server.ts:95-111` creates one D1 batch statement per
  CRN:

  ```ts
  await env.DB.batch([
    /* schedule upsert */,
    /* old association delete */,
    ...uniqueCrns.map((crn, position) =>
      env.DB.prepare(`INSERT INTO schedule_sections ...`).bind(
        token, term, term, crn, position,
      ),
    ),
  ]);
  ```

  At 100 CRNs this is 102 statements. Each current insert uses five bindings, so
  20 rows can be combined into one 100-parameter multi-row statement.
- `src/utils/sections-db.server.ts` is the shared server-only section query
  module. Reuse it from the API and scheduler.
- Current Cloudflare D1 limits to confirm before coding:
  - 100 bound parameters per query;
  - 50 D1 queries per Worker invocation on Workers Free.
  Source: <https://developers.cloudflare.com/d1/platform/limits/>.
- Current Vitest uses jsdom, not workerd. Server behavior must therefore be made
  injectable/testable with a fake D1 interface; pure chunk tests alone are not
  sufficient.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `npm run test -- src/utils/d1-query-limits.test.ts src/utils/sections-by-crns.server.test.ts src/utils/schedule-write-statements.test.ts src/utils/scheduler.test.ts` | exit 0; all named files run and pass |
| Check | `npm run check` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Full tests | `npm run test` | exit 0 |

## Suggested executor toolkit

- Run the repository skill discovery and load the TanStack server-routes skill.
- Read the current D1 limits page before implementation. Platform limits are an
  input to the arithmetic and must not be taken from model memory.
- Keep the existing `createFileRoute(...).server.handlers.GET` route pattern.

## Scope

**In scope**:
- `src/utils/d1-query-limits.ts` (create)
- `src/utils/d1-query-limits.test.ts` (create)
- `src/utils/sections-by-crns.server.ts` (create)
- `src/utils/sections-by-crns.server.test.ts` (create)
- `src/utils/schedule-write-statements.ts` (create)
- `src/utils/schedule-write-statements.test.ts` (create)
- `src/utils/sections-db.server.ts`
- `src/utils/scheduler-db.server.ts`
- `src/routes/api/v1/sections/by-crns/$term.ts`
- `src/utils/scheduler.test.ts`
- `plans/README.md` (status row only)

**Out of scope**:
- Lowering `MAX_SCHEDULE_CRNS` below 100.
- Adding the full Workers Vitest pool/workerd integration harness.
- Changing API response schemas, schedule identity, or CRN ordering.
- Rate limiting, term validation, caching, schema migrations, or remote D1 calls.
- Refactoring unrelated catalog queries or share broadcasting.

## Git workflow

- Branch: `advisor/006-respect-d1-parameter-limits`
- Suggested commit: `Fit 100-CRN schedules within D1 limits`.
- Do not run remote Wrangler or modify production D1.

## Steps

### Step 0: Load guidance and verify current platform limits

Run:

```bash
npx @tanstack/intent@latest list
npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes
```

Read <https://developers.cloudflare.com/d1/platform/limits/> and record the
current bound-parameter and Free-plan per-invocation query limits in execution
notes.

**Verify**: both intent commands exit 0 and the docs still state 100 parameters
and 50 queries. If either changed, STOP and revise the arithmetic/plan first.

### Step 1: Encode and test D1 capacity arithmetic

Create `src/utils/d1-query-limits.ts` and its test in the same step. Export named
constants/functions that make these calculations explicit:

```ts
D1_MAX_BOUND_PARAMETERS = 100
D1_FREE_MAX_QUERIES_PER_INVOCATION = 50
MAX_CRNS_PER_SECTION_LOOKUP = 99 // one term binding
SCHEDULE_SECTION_BINDINGS_PER_ROW = 5
MAX_SCHEDULE_SECTION_ROWS_PER_INSERT = 20
```

The module must provide a generic immutable chunk helper. The test must cover:

- empty, 1, 98, 99, and 100 lookup values;
- 100 lookup values become chunks of 99 and 1;
- 100 schedule rows become five chunks of 20;
- input order and input-array immutability;
- each calculated statement stays at or below 100 bindings.

Also extend `src/utils/scheduler.test.ts` to assert exactly 100 CRNs normalize
successfully and 101 remains rejected.

**Verify**:

```bash
npm run test -- src/utils/d1-query-limits.test.ts src/utils/scheduler.test.ts
```

Expected: both named files run and all boundary assertions pass. Because the test
files now exist, `passWithNoTests` cannot mask this gate.

### Step 2: Add and test an injectable chunked lookup

Create `src/utils/sections-by-crns.server.ts` without importing the global
`env`. Export a function that accepts a D1-compatible database argument plus
`term` and CRNs. `src/utils/sections-db.server.ts` will provide `env.DB` in
production.

The function must:

1. Return `[]` for empty input without preparing/querying D1.
2. Deduplicate CRNs while preserving first-request order.
3. Split values into at most 99 per statement.
4. Prepare and execute statements sequentially, each binding one term plus its
   chunk; never interpolate term/CRNs into SQL.
5. Map rows with existing `mapSection`.
6. Return sections in request order regardless of fake/D1 row order.

Create `src/utils/sections-by-crns.server.test.ts` with a fake database/statement
implementation that records SQL, bindings, and call order. Use a complete
`SectionRow` fixture based on `src/utils/sections.test.ts`.

Required assertions:

- empty input performs zero prepares/runs;
- 100 distinct CRNs perform exactly two queries with 100 and 2 bindings
  respectively (term included);
- duplicate input does not consume duplicate bindings;
- every SQL statement uses placeholders and no raw CRN value;
- deliberately reversed fake rows are returned in request order.

Use structural test doubles; do not import `cloudflare:workers` or use remote/local
D1.

**Verify**:

```bash
npm run test -- src/utils/sections-by-crns.server.test.ts
npm run typecheck
```

Expected: the named test runs/passes and typecheck exits 0.

### Step 3: Combine and test schedule-section inserts

Create `src/utils/schedule-write-statements.ts` as a pure statement-spec builder.
It should return SQL plus binding arrays for the multi-row
`schedule_sections` inserts; `scheduler-db.server.ts` will turn specs into
prepared D1 statements.

For each row preserve the current values and order:

```text
schedule_id from token+term subquery, section term, CRN, position
```

The current shape consumes five bindings per row (`token`, lookup `term`, row
`term`, `crn`, `position`). Chunk at 20 rows so each generated statement has at
most 100 bindings. Use placeholders only.

Create `src/utils/schedule-write-statements.test.ts` covering 0, 1, 20, 21, and
100 rows. For 100 rows assert:

- exactly five insert specs;
- exactly 100 bindings per spec;
- CRN positions remain 0 through 99 across chunks;
- no CRN/token value is interpolated into SQL;
- with the two fixed batch statements, total batch statements are 7, below the
  Free-plan limit of 50.

**Verify**:

```bash
npm run test -- src/utils/schedule-write-statements.test.ts
```

Expected: all statement-count/binding/order cases pass.

### Step 4: Wire both read callers and the schedule batch

In `src/utils/sections-db.server.ts`:

- expose `listSectionsByCrnsAndTermFromDb(term, crns)` by delegating to the tested
  injectable function with `env.DB`;
- keep `listSectionsByPidAndTermFromDb` unchanged.

In `src/utils/scheduler-db.server.ts`:

- use the shared CRN lookup and remove private `loadSectionsByCrns`;
- replace one-insert-per-CRN mapping with the tested multi-row statement specs;
- retain the schedule upsert and old-association delete in the same D1 `batch`,
  preserving atomicity;
- retain `assertAllCrnsExist`, final schedule lookup, ordering, and broadcast.

In `src/routes/api/v1/sections/by-crns/$term.ts`:

- retain the 100 limit and current 400 responses;
- delegate to the shared lookup;
- preserve JSON shape and distinct-input ordering.

Do not lower accepted limits to 99 or split the atomic write into independent
commits.

**Verify**:

```bash
! grep -RIn '\.bind(term, \.\.\.crns)\|\.bind(params.term, \.\.\.crns)' src/utils/scheduler-db.server.ts src/routes/api/v1/sections/by-crns/'$'term.ts
! grep -n '\.\.\.uniqueCrns.map' src/utils/scheduler-db.server.ts
npm run typecheck
```

Expected: unsafe read binding and one-statement-per-CRN write patterns are gone;
typecheck exits 0.

### Step 5: Run focused and full gates

**Verify**:

```bash
npm run test -- src/utils/d1-query-limits.test.ts src/utils/sections-by-crns.server.test.ts src/utils/schedule-write-statements.test.ts src/utils/scheduler.test.ts
npm run check && npm run typecheck && npm run test
git diff --check
git status --short
```

Expected: every named test file runs and passes; all repository gates exit 0;
only in-scope files and the plan status changed.

## Test plan

The tests deliberately stop below full workerd integration but must exercise the
actual injectable query function and the exact statement-spec builder wired into
production. Pure chunk arithmetic alone is insufficient.

Required machine-checkable assertions:

- lookup statements have at most 100 bindings including term;
- a 100-CRN lookup executes exactly two recorded queries;
- a 100-CRN save produces seven batch statements, not 102;
- every generated insert has at most 100 bindings;
- exact 100 normalization, ordering, deduplication, empty input, and query-free
  empty behavior are covered.

## Done criteria

- [ ] D1 parameter/query constants match current Cloudflare docs.
- [ ] Exactly 100 CRNs remain accepted; 101 remain rejected.
- [ ] Both scheduler and API use the tested shared chunked lookup.
- [ ] A 100-CRN lookup binds at most 100 values per query and uses two queries.
- [ ] A 100-CRN persistence batch contains seven statements, all inserts at or below 100 bindings.
- [ ] Query test doubles verify empty, dedupe, placeholders, binding counts, and request ordering.
- [ ] Schedule statement tests verify 0/1/20/21/100 boundaries and positions.
- [ ] `npm run check`, `npm run typecheck`, and `npm run test` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] No out-of-scope file is modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- Current Cloudflare docs no longer state 100 bound parameters or 50 Free-plan
  queries per invocation.
- The current insert shape does not consume five bindings per row; recalculate
  capacity before generating SQL.
- Safe multi-row inserts cannot remain in the existing atomic D1 batch.
- `sections-db.server.ts` integration creates a circular dependency; report the
  cycle rather than hiding it with a dynamic import.
- Existing API clients require duplicate CRNs to produce duplicate objects; the
  current route does not document that behavior.
- Any verification requires remote D1 access.

## Maintenance notes

Any future bound value added to lookup or insert statements reduces per-query
capacity. Keep arithmetic centralized and tests at exact boundaries. The future
Workers integration-test plan should execute the full 100-CRN path in workerd;
this plan still provides executable fake-D1 coverage rather than grep-only
confidence.
