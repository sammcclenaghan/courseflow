# Plan 004: Serialize schedule mutations so the latest edit persists

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and said they maintain the
> index.
>
> **Drift check (run first)**: `git diff --stat ca00dbd..HEAD -- src/components/scheduler/scheduler-page.tsx src/components/scheduler/use-serialized-schedule-commits.ts src/components/scheduler/use-serialized-schedule-commits.test.tsx src/utils/scheduler-domain.ts src/queries/scheduler.ts plans/README.md`
> If the current scheduler already queues saves or derives every edit from the
> live query cache, stop and reassess rather than adding a second mutation
> mechanism.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `ca00dbd`, 2026-07-13

## Why this matters

Scheduler edits optimistically update the query cache, but every save starts
immediately and is intentionally not awaited. Responses are version-guarded on
the client, yet D1 writes can finish out of order; the database may retain an
older edit even while the UI shows the newest one. Rapid actions also build from
`selectedCourses` captured by the current render, allowing one action to erase
another. Saves must execute in user-action order and each action must derive from
the latest optimistic cache state.

## Current state

- `src/components/scheduler/scheduler-page.tsx:42-66` starts each save directly:

  ```ts
  const version = ++saveVersionRef.current;
  queryClient.setQueryData(key, scheduleFromCourses(term, courses, previous));
  const next = await saveMySchedule(/* snapshot CRNs */);
  if (saveVersionRef.current === version) {
    queryClient.setQueryData(key, next);
  }
  ```

- Calls are deliberately floated at lines 77, 88, 96, and 106:

  ```ts
  void commitCourses(/* next courses derived from selectedCourses */);
  ```

- `selectedCourses` comes from the render-time `scheduleQuery.data` at lines
  28-32. An async `addCourse` waits for sections before using that old array.
- `src/utils/scheduler-domain.ts` contains the canonical conversion between
  `ScheduleWithSections` and `SavedCourse[]`. Reuse `expandSavedSchedule`; do not
  create a divergent section grouping implementation.
- Query cache keys come from `scheduleQueryKey(term)` in
  `src/queries/scheduler.ts`.
- The test stack is Vitest + Testing Library. Use `renderHook` and a
  `QueryClientProvider` for a focused hook test rather than rendering the entire
  scheduler shell.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused test | `npm run test -- src/components/scheduler/use-serialized-schedule-commits.test.tsx` | exit 0 |
| Check | `npm run check` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Full tests | `npm run test` | exit 0 |

## Suggested executor toolkit

- Keep `saveMySchedule` as the existing `createServerFn`; do not replace it with
  a raw fetch endpoint.
- Use TanStack Query's mutation `scope` for queue lifetime. A hook-local Promise
  chain is insufficient because unmount/remount can create two active queues.
- TanStack Query is the cache authority. Do not add a second React state copy of
  the schedule.

## Scope

**In scope**:
- `src/components/scheduler/scheduler-page.tsx`
- `src/components/scheduler/use-serialized-schedule-commits.ts` (create)
- `src/components/scheduler/use-serialized-schedule-commits.test.tsx` (create)
- `plans/README.md` (status row only)

**Out of scope**:
- `src/utils/scheduler-db.server.ts`, D1 schema, server revision columns, and
  Durable Object broadcasting.
- Course-detail page mutation behavior in `src/routes/courses/$subjectCode.tsx`;
  it disables its single add action while pending and is not this race.
- Changing schedule response shapes, CRN limits, or anonymous cookie identity.
- Toast redesign, offline sync, undo/redo, or cross-tab synchronization.
- Refactoring child scheduler UI components.

## Git workflow

- Branch: `advisor/004-serialize-schedule-mutations`
- Suggested commit: `Serialize scheduler saves`.
- Do not push or open a PR unless instructed.

## Steps

### Step 0: Load the matching TanStack guidance

Run the repository-mandated discovery and load the matching server-functions
skill before editing:

```bash
npx @tanstack/intent@latest list
npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions
```

Also read the installed `@tanstack/react-query` types/docs for mutation `scope`;
do not rely on an older API example.

**Verify**: both intent commands exit 0 and the installed Query package exposes
`scope` on mutation options.

### Step 1: Add a focused serialized-commit hook

Create `src/components/scheduler/use-serialized-schedule-commits.ts` and export a
hook named `useSerializedScheduleCommits(term)`.

The hook must:

1. Use `useQueryClient`; do not own duplicate schedule state.
2. Return a `commitCourses` function accepting an updater:

   ```ts
   (current: SavedCourse[]) => SavedCourse[]
   ```

   An updater—not a precomputed array—is required so every action reads the
   current query cache at commit time.
3. Read the current `ScheduleWithSections | null` from
   `scheduleQueryKey(term)`, convert it with `expandSavedSchedule`, apply the
   updater, and synchronously write the optimistic schedule back to that cache.
4. Capture immutable mutation variables containing term, CRNs, and a monotonic
   version.
5. Use `useMutation` with a stable scope ID derived from the term, such as
   `schedule-save:${term}`. Mutations with the same scope must execute serially
   through the QueryClient's mutation cache. Do **not** implement a hook-local
   Promise queue.
6. Keep latest-version counters in a module-level `WeakMap` keyed by
   `QueryClient`, with a nested term map. This survives component remount while
   avoiding cross-client/global leakage. A pending Fall save must not affect
   Spring.
7. In the mutation function, call `saveMySchedule` with the captured CRNs.
8. In hook-level `onSuccess`, apply the server response only when the variable's
   version is still latest for that QueryClient/term.
9. In hook-level `onError`, when the failed version is latest, invalidate/refetch
   that term's schedule. Do not restore a snapshot that may contain a failed
   earlier optimistic mutation.
10. A rejected mutation must not block the next same-scope mutation.
11. Log only `Failed to save schedule` (or an equally non-sensitive fixed
    message), not the raw error object.
12. Clean version entries only when no same-term mutation remains pending; never
    drop ordering/version state merely because a component unmounted.

Do not add a queue library or a second state store.

**Verify**:

```bash
npm run typecheck
```

Expected: the new hook typechecks before integration.

### Step 2: Route all SchedulerPage edits through updater functions

In `src/components/scheduler/scheduler-page.tsx`:

1. Replace `saveVersionRef` and the local `commitCourses(courses)` implementation
   with `useSerializedScheduleCommits(term)`.
2. Keep `selectedCourses` for rendering only.
3. Change every mutation to pass an updater:
   - add: append only if the PID is not already present in the *current* array;
   - remove: filter the PID from the current array;
   - section update: map over the current array;
   - clear: return `[]`.
4. In `addCourse`, fetch grouped sections first, then call the updater. Re-check
   PID presence inside the updater because another action may have added it
   while section data loaded.
5. Keep `scheduleFromCourses` in one place. Move it into the hook if it is only
   needed there; do not duplicate it.
6. Preserve existing default-section behavior and optimistic UI.

Do not solve ordering by disabling the whole scheduler during saves. Users must
remain able to make rapid edits; the queue is the correctness mechanism.

**Verify**:

```bash
grep -n "void commitCourses" src/components/scheduler/scheduler-page.tsx
npm run typecheck
```

Expected: all actions call the updater-based function; typecheck exits 0. The
calls may still use `void` because the hook owns error handling.

### Step 3: Add deterministic race regression tests

Create `src/components/scheduler/use-serialized-schedule-commits.test.tsx`.
Mock `saveMySchedule` and use manually controlled deferred promises—never real
timers or network.

Required cases:

1. **FIFO server calls**: invoke two commits immediately; assert only the first
   mocked server call starts, resolve it, then assert the second starts.
2. **Latest optimistic composition**: two updater calls made before a rerender
   must compose from the query cache, so the second result contains both edits
   rather than replacing the first.
3. **Queue survives rejection**: reject the first save and prove the second
   still starts and can become canonical.
4. **Latest failure reconciles**: reject the final save and assert the exact
   schedule query key is invalidated/refetched rather than rolled back locally.
5. **Term isolation**: commits for two terms use separate cache keys and cannot
   apply responses across terms.
6. **Unmount/remount ordering**: start a save, unmount the hook, render a new hook
   with the same QueryClient/term, commit again, and prove the second server call
   waits for the first. This test rejects a hook-local queue implementation.

Use a fresh `QueryClient` per test with retries disabled. Seed
`scheduleQueryKey(term)` directly. Minimal section/course fixtures are preferred
over rendering scheduler children.

**Verify**:

```bash
npm run test -- src/components/scheduler/use-serialized-schedule-commits.test.tsx
```

Expected: all race tests pass deterministically.

### Step 4: Run all gates and inspect scope

**Verify**:

```bash
npm run check && npm run typecheck && npm run test
git diff --check
git status --short
```

Expected: exit 0; only the scheduler page, new hook/test, and plan status changed.

## Test plan

The test must fail against the old concurrent implementation and must control
promise settlement explicitly. The most important assertions are call-start
order, unmount/remount ordering, latest-failure invalidation, and final query-
cache contents. Avoid snapshots, fake D1, real delays, or assertions based only
on a local version ref; the defect is server invocation order.

## Done criteria

- [ ] All scheduler edits derive from the latest query-cache state via updater functions.
- [ ] `saveMySchedule` calls for a term start strictly in user-action order.
- [ ] A rejected save does not prevent later saves.
- [ ] Only the latest response for a term may become canonical in the cache.
- [ ] Latest failures reconcile from the server rather than restoring a stale optimistic snapshot.
- [ ] Separate terms cannot affect one another.
- [ ] The six deterministic regression cases, including latest failure and remount, pass.
- [ ] `npm run check`, `npm run typecheck`, and `npm run test` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] No out-of-scope file is modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- The installed TanStack Query version does not support same-scope serial
  mutations or its documented semantics do not survive observer remount.
- The hook cannot read/write the existing schedule query cache without changing
  the public `ScheduleWithSections` shape.
- Correctness appears to require a D1 schema revision or server-side compare-and-
  swap; that is a different, higher-risk plan.
- A proposed implementation drops queued work on component unmount or term
  navigation.
- Tests need real timers/network or remain timing-dependent after two attempts.

## Maintenance notes

Every future scheduler action must use the updater API; accepting a precomputed
`SavedCourse[]` reintroduces stale-render races. Reviewers should inspect queue
rejection handling and term isolation closely. Server-side revisions may still
be valuable for cross-tab editing later, but are not required for this
single-client ordering defect.
