# Plan 002: Preserve existing sections when a catalog fetch fails

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and said they maintain the
> index.
>
> **Drift check (run first)**: `git diff --stat ca00dbd..HEAD -- src/importer/catalogImport.server.ts src/importer/catalogImport.sql.ts src/importer/catalogImport.cli.ts src/importer/catalogImport.sql.test.ts src/importer/catalogImport.test.ts plans/README.md`
> If an in-scope source file changed, compare the excerpts below with live code.
> Stop if section replacement is already driven by an explicit successful-fetch
> set or if the import result contract has otherwise changed.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ca00dbd`, 2026-07-13

## Why this matters

A successful Kuali course fetch followed by a failed Banner section fetch leaves
`course` populated and `sections` empty. The SQL generator currently deletes
existing sections for every fetched course, so a transient failure can remove
valid timetable data. Worse, even a successful refresh deletes and reinserts
unchanged section rows; the `schedule_sections` foreign key uses `ON DELETE
CASCADE`, so this erases users’ saved-section associations. Replacement must
upsert fetched rows first, preserve unchanged CRNs, and delete only truly stale
rows for courses whose Banner fetch completed successfully.

## Current state

- `src/importer/catalogImport.server.ts` orchestrates per-course Kuali, Banner,
  and enrollment work. At lines 119-128, a Banner error returns a populated
  course, empty sections, and an error:

  ```ts
  try {
    sections = await fetchSectionsForCourse(/* ... */);
  } catch (error) {
    errors.push(`sections: ${errorMessage(error)}`);
    return { entry, course, sections, errors };
  }
  ```

- `src/importer/catalogImport.sql.ts:16-29` derives deletion eligibility from all
  fetched courses rather than section-fetch success:

  ```ts
  const uniqueCourses = uniqueBy(courses, (course) => course.pid);
  const coursePids = uniqueCourses.map((course) => course.pid).filter(Boolean);
  // ...
  DELETE FROM sections WHERE term = ... AND course_pid IN (...);
  ```

- `src/importer/catalogImport.cli.ts:90-122` builds and executes SQL before it
  prints the fetch-error warning. Partial imports are intentional behavior today;
  do not change this plan into “abort on every error.”
- `migrations/0002_schedule_and_connections.sql:18-20` makes saved selections
  dependent on section-row identity:

  ```sql
  FOREIGN KEY (term, crn) REFERENCES sections(term, crn) ON DELETE CASCADE
  ```

  Deleting an unchanged section before reinserting it irreversibly removes the
  corresponding `schedule_sections` row.
- A successful Banner response containing zero sections is materially different
  from a failed Banner request: the former may delete old sections for that
  course/term; the latter must preserve them.
- SQL generation tests live in `src/importer/catalogImport.sql.test.ts`. Match its
  object fixtures, Vitest style, and direct string assertions.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `npm run test -- src/importer/catalogImport.sql.test.ts src/importer/catalogImport.test.ts` | exit 0; importer tests pass |
| Check | `npm run check` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Full tests | `npm run test` | exit 0; all tests pass |

## Scope

**In scope**:
- `src/importer/catalogImport.server.ts`
- `src/importer/catalogImport.sql.ts`
- `src/importer/catalogImport.cli.ts`
- `src/importer/catalogImport.sql.test.ts`
- `src/importer/catalogImport.test.ts` or a new narrowly scoped
  `src/importer/catalogImport.server.test.ts`
- `plans/README.md` (status row only)

**Out of scope**:
- Enrollment freshness/count preservation; that is Plan 003.
- Changing importer concurrency, retries, timeout defaults, or UVic parsers.
- Making all partial imports fail closed.
- D1 schema migrations, production execution, backups, or remote Wrangler calls.
- Catalog autocomplete, offerings, and embeddings generators.

## Git workflow

- Branch: `advisor/002-preserve-sections-on-partial-import`
- Suggested commit: `Preserve sections after catalog fetch failures`.
- Do not run `catalog:import:prod`, modify remote D1, push, or open a PR unless
  instructed.

## Steps

### Step 0: Load repository task guidance

Run the repository-mandated skill discovery before editing:

```bash
npx @tanstack/intent@latest list
```

If a listed importer, TypeScript, or testing skill directly matches this task,
load the most specific one with the printed `load` command and follow it. If no
skill matches, continue without loading one.

**Verify**: the list command exits 0; record any loaded skill in the execution
notes.

### Step 1: Represent section-fetch success explicitly

In `src/importer/catalogImport.server.ts`:

1. Add `sectionFetchSucceeded: boolean` to `CatalogImportCourseResult`.
2. Initialize/return it as `false` when:
   - Kuali course fetching fails,
   - the course ID cannot be parsed, or
   - the Banner section request throws.
3. Set it to `true` immediately after `fetchSectionsForCourse` resolves, even if
   the returned array is empty.
4. Do not derive success from `sections.length`.
5. Extend `CatalogImportResult` with a clearly named list such as
   `sectionReplacementPids: string[]`, derived from course results where both
   `course !== null` and `sectionFetchSucceeded` are true. Deduplicate it while
   preserving entry order.
6. Keep `courses`, `sections`, `courseResults`, and `errors` unchanged for callers.

Prefer a small pure helper for deriving the PID list if that makes the success
matrix directly testable. Use existing `mapConcurrent`/plain-array conventions;
do not add a dependency.

**Verify**:

```bash
npm run typecheck
```

Expected: exit 0 after all result construction sites provide the boolean and
result list.

### Step 2: Generate non-destructive replacement SQL

In `src/importer/catalogImport.sql.ts`:

1. Add `sectionReplacementPids: readonly string[]` to
   `CatalogImportSqlInput` and update the existing test fixture call in the same
   edit so the test file still typechecks.
2. Deduplicate the list and intersect it with PIDs in `courses`. This prevents a
   malformed caller from deleting a course outside the same import result.
3. Emit SQL in this order: course upserts, fetched section upserts, then stale-
   section deletes for eligible PIDs.
4. Never issue the current broad delete before section upserts.
5. For each eligible PID with fetched CRNs, delete only rows for the same term
   and PID whose CRN is **not** in that fetched set. Use `sqlString`; never place
   unescaped values in generated SQL.
6. For an eligible PID with a successful empty result, delete all section rows
   for that term/PID.
7. If no PID is eligible, emit no section-delete statement.
8. Preserve unchanged `(term, crn)` rows via upsert so their foreign-key targets
   remain present and saved `schedule_sections` associations survive.

Do not infer eligibility from `sections.length`: a legitimate empty result has
no rows but must still replace the old set.

**Verify**:

```bash
npm run typecheck
git diff --check -- src/importer/catalogImport.sql.ts src/importer/catalogImport.sql.test.ts
```

Expected: exit 0. Focused behavioral tests are added and run in Step 4.

### Step 3: Wire the CLI to the safe contract

In `src/importer/catalogImport.cli.ts`, pass
`result.sectionReplacementPids` into `buildCatalogImportSql`.

Keep existing behavior that writes a report, applies successful partial results,
and warns when `result.errors` is non-empty. The safety now comes from excluding
failed section fetches from replacement, not from suppressing all partial work.

**Verify**:

```bash
npm run typecheck
grep -n "sectionReplacementPids" src/importer/catalogImport.cli.ts src/importer/catalogImport.server.ts src/importer/catalogImport.sql.ts
```

Expected: typecheck exits 0 and all three layers use the explicit contract.

### Step 4: Add regression tests

Extend `src/importer/catalogImport.sql.test.ts` with at least these cases:

1. **Successful replacement preserving CRNs**: section upserts occur before the
   stale delete; the delete excludes fetched CRNs rather than deleting all rows.
2. **Unchanged CRN identity**: generated SQL contains no broad pre-upsert delete,
   protecting `schedule_sections` from `ON DELETE CASCADE`.
3. **Failed section fetch**: the course is present but the replacement list is
   empty; no `DELETE FROM sections` is emitted.
4. **Successful empty offering set**: the PID is eligible but `sections` is
   empty; a term/PID delete is emitted and no section insert is emitted.
5. **Defensive intersection**: a replacement PID absent from `courses` is not
   placed in any delete statement.
6. **Multiple courses**: each eligible PID’s stale-delete exclusion contains
   only that course’s fetched CRNs.

Add a pure-result test in the existing importer test file or a new server test
that proves only `sectionFetchSucceeded: true` results contribute PIDs. Avoid
real network requests.

**Verify**:

```bash
npm run test -- src/importer/catalogImport.sql.test.ts src/importer/catalogImport.test.ts src/importer/catalogImport.server.test.ts
```

If the optional new file does not exist, omit it from the command. Expected: all
selected importer tests pass.

### Step 5: Run repository gates and inspect scope

**Verify**:

```bash
npm run check && npm run typecheck && npm run test
git diff --check
git status --short
```

Expected: all gates exit 0; only in-scope files and the plan status row changed.

## Test plan

Use `src/importer/catalogImport.sql.test.ts` as the primary pattern. Tests must
assert SQL order, stale-only deletion, and both presence and absence of delete
statements—not only returned metadata. Include the successful-empty distinction
because that is why `sections.length > 0` is incorrect. The unchanged-CRN test
must guard against the `ON DELETE CASCADE` data loss. Do not call UVic or
remote/local D1 in tests.

## Done criteria

- [ ] Every `CatalogImportCourseResult` records whether Banner section fetching completed.
- [ ] SQL deletion uses an explicit successful replacement PID list.
- [ ] Fetched sections are upserted before stale rows are deleted.
- [ ] Unchanged `(term, crn)` rows are never deleted/reinserted, preserving saved schedules.
- [ ] Failed section fetches cannot emit a delete for that course/term.
- [ ] Successful empty section fetches still emit the intended delete.
- [ ] The CLI still reports and safely applies partial successes.
- [ ] Focused importer tests cover the four required cases.
- [ ] `npm run check`, `npm run typecheck`, and `npm run test` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] No out-of-scope file is modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- Wrangler/D1 import behavior has changed so the SQL file is no longer applied
  atomically; do not redesign production import transactions in this plan.
- The code cannot distinguish a successful empty Banner response from a failed
  request without changing the UVic fetch API beyond the listed files.
- A production-data migration or remote D1 access appears necessary.
- Plan 003 has already changed the same SQL contract in an incompatible way;
  reconcile plan order rather than overwriting its freshness logic.
- The fix would delete based on `sections.length`, error-message text, or any
  other proxy instead of explicit success state.
- Safe replacement appears to require disabling foreign keys or removing the
  `ON DELETE CASCADE` constraint. Do not weaken referential integrity.

## Maintenance notes

Any future importer stage that replaces a complete child collection should
carry explicit fetch-completion state; empty data is not equivalent to failed
data. Reviewers should focus on SQL order, unchanged row identity, the
successful-empty case, and the intersection guard. Enrollment failure semantics
remain separate in Plan 003, whose conflict-update logic depends on this plan
preserving fetched section rows.
