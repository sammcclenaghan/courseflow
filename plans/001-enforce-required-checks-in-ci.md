# Plan 001: Enforce the required repository checks in CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and said they maintain the
> index.
>
> **Drift check (run first)**: `git diff --stat ca00dbd..HEAD -- AGENTS.md package.json package-lock.json .github/workflows plans/README.md`
> If `AGENTS.md` or the package scripts changed since this plan was written,
> compare them with the excerpts below. Stop if the required verification gates
> are no longer `check`, `typecheck`, and `test`.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `ca00dbd`, 2026-07-13

## Why this matters

The repository documents three mandatory checks, and all three currently pass,
but no tracked CI workflow runs them. A pull request or direct push can therefore
merge code that fails formatting/lint, TypeScript, or tests. This plan makes the
existing policy enforceable without changing the application or deployment
pipeline.

## Current state

- `AGENTS.md:13-17` defines the mandatory gates:

  ```md
  - `npm run check` and `npm run typecheck` must pass before considering any task complete.
  - `npm run test` must pass. Add or update tests for any behaviour change.
  ```

- `package.json:10-13,36` already exposes the exact scripts:

  ```json
  "test": "vitest run --config vitest.config.ts",
  "check": "biome check",
  "typecheck": "tsc --noEmit"
  ```

- There is no tracked `.github/workflows/` directory. `.github/` currently only
  contains the README screenshot.
- The package manager is pinned as `npm@11.12.1` in `package.json`. Use `npm ci`,
  not pnpm or an unpinned install command.
- Baseline at planning time: Biome checked 112 files, TypeScript exited 0, and
  Vitest passed 13 files / 49 tests.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm ci` | exit 0; lockfile remains unchanged |
| Check | `npm run check` | exit 0; “No fixes applied” |
| Typecheck | `npm run typecheck` | exit 0; no errors |
| Tests | `npm run test` | exit 0; all test files pass |
| Diff hygiene | `git diff --check` | exit 0; no output |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/ci.yml` (create)
- `plans/README.md` (status row only)

**Out of scope**:
- `package.json` and `package-lock.json`; the required scripts already exist.
- Deployment, Wrangler authentication, D1 remote access, catalog imports, and
  generated assets.
- Adding build, deploy, dependency-audit, release, or preview jobs.
- Branch-protection settings; those are configured outside this repository.
- Pre-commit hooks or Node-version policy files.

## Git workflow

- Branch: `advisor/001-enforce-required-checks-in-ci`
- Use a concise imperative commit message, for example:
  `Add CI checks for pull requests`.
- Do not push or open a pull request unless instructed.

## Steps

### Step 0: Run repository skill discovery

Before editing, run the project-mandated command:

```bash
npx @tanstack/intent@latest list
```

No current local skill is expected to be specific to a GitHub Actions-only
change. If a directly matching CI skill appears, load it with the command shown
by the tool; otherwise continue.

**Verify**: the list command exits 0.

### Step 1: Add the checks workflow

Create `.github/workflows/ci.yml` with these properties:

1. Name it `CI`.
2. Trigger it for `pull_request` and pushes to `main`.
3. Grant only `contents: read` permission.
4. Add one job named `checks` on `ubuntu-latest` with a 10-minute timeout.
5. Use `actions/checkout@v4` and `actions/setup-node@v4`.
6. Configure Node 24 and npm caching via `cache: npm`.
7. Run, in this order:
   - `npm ci`
   - `npm run check`
   - `npm run typecheck`
   - `npm run test`
8. Do not add secrets, Cloudflare credentials, D1 setup, or deployment steps.

Use normal two-space YAML indentation. Keep the workflow intentionally small;
the repository has no existing Actions abstraction to copy.

**Verify**:

```bash
ruby -e 'require "yaml"; YAML.parse_file(".github/workflows/ci.yml")'
node - <<'NODE'
const text = require("node:fs").readFileSync(".github/workflows/ci.yml", "utf8")
const required = [
  "name: CI",
  "pull_request:",
  "push:",
  "branches: [main]",
  "contents: read",
  "checks:",
  "runs-on: ubuntu-latest",
  "timeout-minutes: 10",
  "actions/checkout@v4",
  "actions/setup-node@v4",
  "node-version: 24",
  "cache: npm",
  "npm ci",
  "npm run check",
  "npm run typecheck",
  "npm run test",
]
for (const item of required) {
  if (!text.includes(item)) throw new Error(`Missing workflow contract: ${item}`)
}
NODE
git diff --check -- .github/workflows/ci.yml
```

Expected: Ruby parses the YAML, the Node contract check exits 0, and
`git diff --check` exits 0 without output.

### Step 2: Re-run the same gates locally

Run the commands exactly as CI will run them, except `npm ci` may be skipped if
it was already run in this unchanged worktree.

**Verify**:

```bash
npm run check && npm run typecheck && npm run test
```

Expected: exit 0; all tests pass.

### Step 3: Confirm scope and update the plan index

Only the new workflow and the status row in `plans/README.md` may be changed.

**Verify**:

```bash
git status --short
git diff --check
```

Expected: `.github/workflows/ci.yml` plus the `plans/README.md` status update,
and no whitespace errors.

## Test plan

No application test is added because this is a CI-only change. The workflow's
commands are its contract. Run the complete local check/typecheck/test sequence
and, once pushed by the operator, confirm the GitHub Actions `checks` job starts
and passes. Do not push merely to perform this verification.

## Done criteria

- [ ] `.github/workflows/ci.yml` exists and triggers on pull requests and pushes to `main`.
- [ ] The workflow uses Node 24, `npm ci`, and exactly the three required npm gates.
- [ ] The workflow contains no credentials, D1 setup, build, or deploy step.
- [ ] `npm run check` exits 0.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run test` exits 0.
- [ ] `git diff --check` exits 0.
- [ ] No file outside the in-scope list is modified.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

Stop and report if:

- `package.json` no longer contains all three documented scripts.
- `npm ci` changes `package-lock.json` or requires an undocumented registry or
  credential.
- Node 24 is incompatible with the pinned package set.
- The repository gained another CI workflow after `ca00dbd` that already runs
  these gates; reconcile rather than creating duplicate CI.
- Any required check fails on the unchanged baseline. Do not hide failures with
  `continue-on-error`, exclusions, or `passWithNoTests` changes.

## Maintenance notes

When a mandatory repository gate changes, update both `AGENTS.md` and this
workflow in the same change. Reviewers should reject `continue-on-error` on any
of the three gates. Deployment remains deliberately separate so pull requests
do not require Cloudflare secrets.
