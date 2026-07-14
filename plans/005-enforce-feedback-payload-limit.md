# Plan 005: Enforce and test the feedback payload limit

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and said they maintain the
> index.
>
> **Drift check (run first)**: `git diff --stat ca00dbd..HEAD -- src/utils/feedback.functions.ts src/utils/feedback-sanitizer.ts src/utils/feedback.test.ts plans/README.md`
> If the handler no longer passes a hardcoded byte count or the transport format
> is no longer JSON-serializable server-function data, stop and reassess.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ca00dbd`, 2026-07-13

## Why this matters

The feedback sanitizer defines a 64 KiB limit and tests it, but the real server-
function handler always reports zero bytes. The limit therefore never runs in
production. TanStack transports a Seroval `{ data, context }` envelope, so
`JSON.stringify(data)` is not the exact wire size; the fix must enforce both the
available wire `Content-Length` and a clearly documented 64 KiB normalized
feedback-data limit. Large nested arrays must also be capped before sanitizer
mapping/webhook work.

## Current state

- `src/utils/feedback.functions.ts:14-18`:

  ```ts
  export const submitFeedback = createServerFn({ method: "POST" })
    .validator((data: unknown) => data)
    .handler(async ({ data }) => {
      const parsed = parseFeedbackSubmission(data, 0);
  ```

- `src/utils/feedback-sanitizer.ts:11,190-192` defines and checks the intended
  limit:

  ```ts
  const MAX_REQUEST_BYTES = 64 * 1024;
  if (bodyBytes > MAX_REQUEST_BYTES) {
    return { ok: false, status: 413, message: "request body too large" };
  }
  ```

- `sanitizeScheduler` currently calls `readRecordArray(...).map(...).slice(...)`.
  The 32-course and 200-event caps therefore limit output but not traversal.
- `sanitizeSearch` iterates every enumerable key without an entry cap.
- `src/utils/feedback.test.ts` is the test exemplar. It currently proves only
  that a caller-supplied oversized number is rejected; it does not exercise the
  server-bound measurement path.
- TanStack Start server functions are independently reachable API endpoints.
  Keep validation inside the server function/helper, not only in the React form.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `npm run test -- src/utils/feedback.test.ts` | exit 0 |
| Check | `npm run check` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Full tests | `npm run test` | exit 0 |

## Suggested executor toolkit

- Load the local TanStack Start server-functions skill if available. Use
  `createServerFn` and request-context helpers; do not replace the endpoint with
  a framework from another ecosystem.
- Cloudflare Workers have a 128 MB memory limit. Do not solve this by buffering
  multiple copies of an already oversized payload without first checking a
  trustworthy available length signal.

## Scope

**In scope**:
- `src/utils/feedback.functions.ts`
- `src/utils/feedback-sanitizer.ts`
- `src/utils/feedback.test.ts`
- `plans/README.md` (status row only)

**Out of scope**:
- Discord webhook format, feedback diagnostics/privacy fields, or UI disclosure.
- Adding CAPTCHA, KV, Durable Objects, or rate limiting.
- Changing message/page limits or the public successful return value.
- Reading raw request streams or replacing TanStack Start serialization.
- Logging payload contents.

## Git workflow

- Branch: `advisor/005-enforce-feedback-payload-limit`
- Suggested commit: `Enforce feedback payload size limit`.
- Do not push or open a PR unless instructed.

## Steps

### Step 0: Load the matching TanStack guidance

Run the repository-mandated discovery and load the server-functions skill:

```bash
npx @tanstack/intent@latest list
npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions
```

Confirm from the installed TanStack source that the request uses a Seroval
server-function envelope. Do not describe normalized JSON size as exact wire
size.

**Verify**: both intent commands exit 0.

### Step 1: Add a pure wire/normalized measurement boundary

In `src/utils/feedback-sanitizer.ts`, add a pure exported helper used by the real
handler, for example `parseServerFeedbackSubmission(raw, contentLength?)`.

Define the contract explicitly in code comments/tests:

- the existing 64 KiB constant is the maximum accepted wire body when a valid
  `Content-Length` is available;
- it is also the maximum UTF-8 JSON size of the normalized feedback `data`
  object, used as a fallback/semantic cap because TanStack's Seroval envelope is
  not reproducible from handler data alone.

Required behavior:

1. If a valid non-negative `Content-Length` exceeds the limit, return the
   existing 413 result before JSON serialization/sanitizer traversal.
2. Independently calculate UTF-8 byte length of `JSON.stringify(raw)` with
   `TextEncoder`; multi-byte characters must count correctly. If this normalized
   data exceeds the limit, return 413 even when the header is missing or smaller.
3. Treat feedback input as a plain JSON-compatible contract. If serialization
   fails or returns `undefined`, return the existing 400 invalid-body result;
   do not attempt to support arbitrary Seroval values.
4. Pass the normalized byte size into `parseFeedbackSubmission` or fold the
   existing check into this helper without losing focused testability.
5. Keep wire-size and normalized-size variable names distinct; neither may be
   called the exact serialized server-function size.

TanStack has already deserialized input by handler time, so this primarily
prevents sanitizer traversal and webhook work. Do not claim it prevents all
framework-level buffering.

**Verify**:

```bash
npm run typecheck
```

Expected: helper and existing parser typecheck.

### Step 2: Use the helper in the real server function

In `src/utils/feedback.functions.ts`:

1. Import `getRequestHeader` from `@tanstack/react-start/server` alongside the
   existing response helper.
2. Read `content-length` inside the handler.
3. Call the new server-bound helper with `data` and that header.
4. Preserve `Cache-Control: no-store`, response-status behavior, errors, delivery,
   and successful `null` return.
5. Remove every production call that passes literal `0` as body size.

Do not move this check into the client component; client validation is bypassable.

**Verify**:

```bash
! grep -RIn "parseFeedbackSubmission(data, 0)" src/utils/feedback.functions.ts
npm run typecheck
```

Expected: grep finds no hardcoded-zero production path and typecheck exits 0.

### Step 3: Bound arrays before mapping

Refactor `readRecordArray` or its callers in
`src/utils/feedback-sanitizer.ts` with these exact constants:

- selected courses: 32;
- sections: 100 total across all selected courses, enforced with a remaining-
  budget counter rather than 100 per course;
- calendar events: 200;
- search entries: 32.

Slice arrays before `.map`. For search, use an iteration that stops after 32
accepted keys rather than `Object.entries(value).slice(...)`, which allocates all
entries first. Keep existing field clipping/output shapes. This bounds sanitizer
mapping and value access after the normalized-size check; do not claim it avoids
TanStack deserialization or JSON measurement of the whole input.

**Verify**:

```bash
npm run test -- src/utils/feedback.test.ts
```

Expected: existing sanitization tests still pass.

### Step 4: Add regression and boundary tests

Extend `src/utils/feedback.test.ts` with:

1. A serialized payload below 64 KiB is accepted.
2. A serialized payload above 64 KiB returns status 413 without passing a manual
   byte count.
3. UTF-8 multi-byte text is measured in bytes, not UTF-16 code units.
4. An oversized valid `Content-Length` short-circuits to 413.
5. Missing/invalid `Content-Length` falls back to serialized measurement.
6. Arrays larger than each exact cap produce output of 32 courses, at most 100
   total nested sections, and 200 events; search produces at most 32 entries.
7. Existing message, mood, and field sanitization remains unchanged.

Tests must call the helper used by `submitFeedback`, not only the lower-level
parser that accepts an arbitrary number.

**Verify**:

```bash
npm run test -- src/utils/feedback.test.ts
```

Expected: all old and new feedback tests pass.

### Step 5: Run all gates and inspect scope

**Verify**:

```bash
npm run check && npm run typecheck && npm run test
git diff --check
git status --short
```

Expected: all gates exit 0; only in-scope files and plan status changed.

## Test plan

Use the existing table-free Vitest style in `src/utils/feedback.test.ts`. The
critical regression test invokes the same pure helper as the production handler
and supplies no manual body-size number. Include one multi-byte case because a
character-count implementation would otherwise look correct in ASCII-only tests.

## Done criteria

- [ ] The production feedback handler no longer supplies a hardcoded zero size.
- [ ] Normalized JSON-compatible feedback data is measured as UTF-8 bytes.
- [ ] Oversized valid Content-Length can reject before object serialization.
- [ ] Missing/untrusted Content-Length still falls back to the documented normalized-data cap.
- [ ] Selected courses, nested sections, events, and search keys are capped before mapping.
- [ ] New tests exercise the production helper and all required boundaries.
- [ ] Existing feedback behavior and response statuses remain intact.
- [ ] `npm run check`, `npm run typecheck`, and `npm run test` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] No out-of-scope file is modified.
- [ ] `plans/README.md` status is updated.

## STOP conditions

Stop and report if:

- TanStack Start exposes a supported exact raw body length/stream API inside the
  handler that supersedes the two-limit contract; document and test it before
  revising the approach.
- Existing legitimate feedback data is not plain JSON-compatible.
- Correct enforcement requires replacing TanStack's request parser or changing
  global Worker routing.
- The fix logs or returns submitted feedback content.
- Existing clients rely on payloads above 64 KiB; do not silently raise the
  documented cap.

## Maintenance notes

Any new nested feedback field must receive both a field-size limit and a
collection-count limit before traversal. Reviewers should check that tests call
the production helper and that no later refactor reintroduces a trusted caller-
supplied byte count.
