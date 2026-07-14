# Plan 003: Preserve and expose enrollment freshness

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and said they maintain the
> index.
>
> **Drift check (run first)**: `git diff --stat ca00dbd..HEAD -- migrations src/importer src/utils/sections-domain.server.ts src/utils/sections-types.ts src/utils/enrollment.ts src/routes/courses/'$'subjectCode.tsx src/components/scheduler/selected-courses-sidebar.tsx src/components/calendar/calendar-event.test.tsx plans/README.md`
> Plan 002 is expected to have added explicit section-replacement state to the
> importer and SQL input. That specific drift is acceptable. Stop if enrollment
> columns are already nullable/freshness-aware or if Plan 002's replacement
> safety would be removed by the proposed SQL edits.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/002-preserve-sections-on-partial-import.md`
- **Category**: bug
- **Planned at**: commit `ca00dbd`, 2026-07-13

## Why this matters

Banner section parsing initializes enrollment counts to zero. If enrollment HTML
cannot be parsed—or the importer runs with `--skip-enrollment`—those zeroes are
still upserted over previously valid counts. A zero is a factual value, not an
“unknown” sentinel, so CourseFlow can falsely report a section as full or empty.
This plan preserves prior counts when refresh did not succeed and gives new or
unrefreshed rows an explicit unknown state in the API and UI.

## Current state

- `src/importer/uvicBanner.server.ts:81-87` initializes every parsed section:

  ```ts
  enrollmentActual: 0,
  enrollmentMaximum: 0,
  enrollmentSeatsAvailable: 0,
  waitlistCapacity: 0,
  waitlistActual: 0,
  waitlistSeatsAvailable: 0,
  enrollmentRefreshed: false,
  ```

- `src/importer/uvicEnrollment.server.ts:36-45` silently returns on parser
  failure and only then marks a section refreshed:

  ```ts
  const counts = parseEnrollmentHtml(html);
  if (!counts) return;
  // assign counts
  section.enrollmentRefreshed = true;
  ```

- `src/importer/catalogImport.sql.ts:120-147` always inserts and overwrites all
  enrollment fields, without consulting `enrollmentRefreshed`.
- `migrations/0001_initial_course_flow_schema.sql` defines numeric enrollment
  columns as `NOT NULL DEFAULT 0`; there is no freshness timestamp.
- `src/utils/sections-domain.server.ts` maps database rows to the shared
  `Section` type in `src/utils/sections-types.ts`.
- Enrollment is rendered in exactly two application surfaces:
  - `src/routes/courses/$subjectCode.tsx:496-499`
  - `src/components/scheduler/selected-courses-sidebar.tsx:237-310`
- `src/utils/sections.test.ts` is the mapping-test exemplar. Import SQL behavior
  is tested in `src/importer/catalogImport.sql.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Import tests | `npm run test -- src/importer/catalogImport.sql.test.ts src/importer/catalogImport.test.ts` | exit 0 |
| Section tests | `npm run test -- src/utils/sections.test.ts` | exit 0 |
| Check | `npm run check` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Full tests | `npm run test` | exit 0 |

## Scope

**In scope**:
- `migrations/0005_enrollment_freshness.sql` (create)
- `src/importer/uvicEnrollment.server.ts`
- `src/importer/catalogImport.server.ts`
- `src/importer/catalogImport.sql.ts`
- `src/importer/catalogImport.sql.test.ts`
- `src/importer/catalogImport.test.ts`
- `src/importer/catalogImport.server.test.ts` (create if refresh outcome tests are kept separate)
- `src/utils/sections-domain.server.ts`
- `src/utils/sections-types.ts`
- `src/utils/sections.test.ts`
- `src/utils/enrollment.ts` and `src/utils/enrollment.test.ts` (create)
- `src/routes/courses/$subjectCode.tsx`
- `src/components/scheduler/selected-courses-sidebar.tsx`
- `src/components/calendar/calendar-event.test.tsx` (fixture type update only)
- `plans/README.md` (status row only)

**Out of scope**:
- Automated/cron enrollment refresh, queues, or live Banner calls from requests.
- Changing enrollment concurrency, retry policy, or UVic endpoints.
- Reworking section replacement eligibility from Plan 002.
- Treating zero as unknown; zero remains a valid count when refresh succeeded.
- Historical backfilling of a freshness timestamp for existing rows. Existing
  provenance is unknown and must remain null until refreshed.
- New visual design components or broad course-detail refactors.

## Git workflow

- Branch: `advisor/003-preserve-enrollment-freshness`
- Suggested commit: `Preserve enrollment data when refresh fails`.
- Do not run production imports, production migrations, or remote Wrangler commands.
  Applying migrations to the ignored local Wrangler database is required below.

## Steps

### Step 0: Load repository task guidance

Run the repository-mandated discovery command before editing:

```bash
npx @tanstack/intent@latest list
```

Load any directly matching importer or TanStack Start skill using the command
printed by the tool. If none matches, continue. Record loaded guidance in the
execution notes.

**Verify**: the list command exits 0.

### Step 1: Add explicit database freshness

Create `migrations/0005_enrollment_freshness.sql`:

1. Enable foreign keys, matching existing migration style.
2. Add a nullable `enrollment_updated_at TEXT` column to `sections`.
3. Do not backfill it. Existing rows must be represented as freshness unknown.
4. Do not alter the existing numeric `NOT NULL` columns in this migration.

A nullable timestamp is the source of truth:
- non-null = the six count values came from a successful enrollment refresh;
- null = counts must not be presented as current factual data.

**Verify**:

```bash
npm run d1:migrate:local
npx wrangler d1 execute course-flow-v4 --local --json --command "PRAGMA table_info(sections)" | grep "enrollment_updated_at"
git diff --check -- migrations/0005_enrollment_freshness.sql
```

Expected: local migrations exit 0, the schema output contains one nullable
`enrollment_updated_at` column, and there are no whitespace errors. Changes
under ignored `.wrangler/` are expected; no tracked data file may change.

### Step 2: Collect per-section refresh outcomes without early rejection

Refactor `refreshEnrollment` in `src/importer/uvicEnrollment.server.ts` to return
a structured summary instead of `Promise<void>`, for example refreshed count plus
an array of `{ crn, error }` outcomes.

Requirements:

1. Catch fetch and parse failures **inside each `mapConcurrent` mapper** so one
   failed section does not reject `Promise.all` while other workers keep mutating
   after the caller has returned.
2. Convert `parseEnrollmentHtml(...) === null` into a safe per-section error that
   identifies term/CRN but does not include upstream HTML.
3. Set `enrollmentRefreshed = true` only after all six values are parsed and
   assigned.
4. Await all workers before returning the summary. No section may mutate after
   `refreshEnrollment` resolves.
5. In `src/importer/catalogImport.server.ts`, append summary failures to the
   existing course error list and report the refreshed count. Preserve the
   existing outer catch only for unexpected whole-operation failures.
6. Do not change concurrency, retries, endpoints, or delay behavior.

Add tests proving malformed/partial HTML is reported, successful siblings still
refresh, and the returned promise does not settle until every worker has
finished. Use injected/mocked fetch functions and deferred promises, not timers
or real UVic requests.

**Verify**:

```bash
npm run test -- src/importer/catalogImport.test.ts src/importer/catalogImport.server.test.ts
```

If extending the existing test instead of creating the second file, omit the
missing path. Expected: all refresh-outcome tests pass deterministically.

### Step 3: Preserve counts on unrefreshed upserts

Update `src/importer/catalogImport.sql.ts` without undoing Plan 002's explicit
section-replacement PID contract.

1. Include `enrollment_updated_at` in the section insert column list.
2. For `section.enrollmentRefreshed === true`, insert the SQL execution timestamp.
3. For `false`, insert `NULL`.
4. In `ON CONFLICT(term, crn) DO UPDATE`:
   - update each enrollment/waitlist count from `excluded` only when
     `excluded.enrollment_updated_at IS NOT NULL`;
   - otherwise retain the existing `sections.<count_column>` value;
   - set `enrollment_updated_at` to the new non-null timestamp when refreshed,
     otherwise retain `sections.enrollment_updated_at`.
5. Continue updating non-enrollment section metadata as today.
6. A brand-new unrefreshed row will have zero defaults plus a null timestamp;
   the UI changes below ensure those zeroes are not presented as known counts.

Do not use truthiness of any count to infer refresh success. A legitimate
successful response may contain all zeroes.

**Verify**:

```bash
npm run test -- src/importer/catalogImport.sql.test.ts
```

Expected: all SQL tests pass, including refreshed and unrefreshed paths.

### Step 4: Carry freshness through the section contract

In `src/utils/sections-domain.server.ts`:

1. Add `enrollment_updated_at: string | null` to `SectionRow`.
2. Map it to `enrollmentUpdatedAt`.

In `src/utils/sections-types.ts`, add:

```ts
enrollmentUpdatedAt: string | null;
```

Update `src/utils/sections.test.ts` to cover both a non-null timestamp and null.
Update the direct `Section` fixture in
`src/components/calendar/calendar-event.test.tsx` with the new property. Let
TypeScript identify any additional structural fixtures; only update a file if it
constructs a complete `Section` and therefore must satisfy the shared type.

**Verify**:

```bash
npm run typecheck
npm run test -- src/utils/sections.test.ts src/components/calendar/calendar-event.test.tsx
```

Expected: exit 0 and mapping tests prove both states.

### Step 5: Render unknown enrollment honestly through one tested helper

Create a client-safe helper in `src/utils/enrollment.ts` and require both UI
surfaces to use it. It must derive at least `isAvailable` and `isFull` from a
`Section`; the canonical availability predicate is
`section.enrollmentUpdatedAt !== null`, and `isFull` may be true only when data
is available and seats are `<= 0`. Do not infer availability from numeric values.

Update the two rendering surfaces:

- `src/routes/courses/$subjectCode.tsx`
  - show the existing `actual/maximum enrolled` text only when freshness is
    non-null;
  - otherwise show `Enrollment unavailable`.
- `src/components/scheduler/selected-courses-sidebar.tsx`
  - only classify a section as full when freshness is non-null and seats
    available is `<= 0`;
  - show counts/waitlist only when freshness is non-null;
  - show a concise `Enrollment unavailable` state otherwise.

If displaying the timestamp, use built-in `Intl.DateTimeFormat`; do not add a
date dependency. Keep the existing components, icons, typography, and tooltip
patterns.

Add `src/utils/enrollment.test.ts`. Cover a successfully refreshed all-zero
section to prove it is known/full data, and a null-timestamp nonzero fixture to
prove timestamp—not count—is authoritative. Then verify both components import
and call the helper; this makes the UI rule machine-checkable without brittle DOM
snapshots.

**Verify**:

```bash
npm run test -- src/utils/enrollment.test.ts src/utils/sections.test.ts
grep -n "@/utils/enrollment" src/routes/courses/'$'subjectCode.tsx src/components/scheduler/selected-courses-sidebar.tsx
npm run typecheck
```

Expected: helper tests pass, both UI files import the helper, and typecheck exits 0.

### Step 6: Run all gates and inspect the migration/SQL together

**Verify**:

```bash
npm run check && npm run typecheck && npm run test
grep -RIn "enrollment_updated_at\|enrollmentUpdatedAt" migrations src/importer src/utils src/routes/courses src/components/scheduler
git diff --check
git status --short
```

Expected: all gates pass; the timestamp appears from migration through SQL,
mapping, and UI; only in-scope files changed.

## Test plan

Required regression cases:

1. Malformed/partial Banner enrollment HTML is returned as an error and does not mark a section refreshed.
2. Concurrent refresh waits for all sections and records mixed success/failure without post-return mutation.
3. Refreshed SQL updates all six counts and freshness timestamp, including when
   all values are zero.
4. Unrefreshed SQL preserves all six existing counts and timestamp on conflict.
5. A new unrefreshed row maps to `enrollmentUpdatedAt: null`.
6. The mapper exposes non-null and null timestamps correctly.
7. The shared UI helper uses timestamp state, not count truthiness.

Follow the direct fixture/assertion style in
`src/importer/catalogImport.sql.test.ts` and `src/utils/sections.test.ts`. Do not
use real network or D1 calls.

## Done criteria

- [ ] Migration 0005 adds nullable `sections.enrollment_updated_at` without backfill.
- [ ] Enrollment parse failure is recorded rather than silently accepted.
- [ ] Unrefreshed imports preserve existing counts on conflict.
- [ ] Successfully refreshed all-zero counts still update correctly.
- [ ] `Section` exposes `enrollmentUpdatedAt: string | null`.
- [ ] Both UI surfaces use the tested shared helper, display unknown data as unavailable, and do not mark it full.
- [ ] Required regression tests pass.
- [ ] `npm run check`, `npm run typecheck`, and `npm run test` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] No out-of-scope file is modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- Plan 002 has not landed and the SQL generator still deletes sections based on
  every fetched course; complete/reconcile Plan 002 first.
- D1 rejects adding a nullable column in the local migration harness.
- The production database already contains a different freshness column or
  external refresh contract not represented in migrations.
- Correct handling requires treating numeric zero as unknown.
- A test requires real UVic or remote D1 access.
- Enrollment workers can still mutate section objects after `refreshEnrollment`
  resolves; do not ship an early-reject `Promise.all` design.
- The proposed SQL would erase an existing non-null freshness timestamp when
  refresh fails.

## Maintenance notes

Every future count source must set freshness only after all six values are
validated. Reviewers should scrutinize successful all-zero values and
unrefreshed conflict updates; those are the cases most likely to regress. A
scheduled refresh pipeline and stale-age policy are follow-up product work, not
part of this fix.
