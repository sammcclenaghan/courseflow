# AGENTS.md

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `npx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Task Completion Requirements

- `nub run check` and `nub run typecheck` must pass before considering any task complete.
- `nub run test` must pass. Add or update tests for any behaviour change.

## Project Snapshot

Course flow is a class scheduler for University of Victoria students. Students should search the UVic catalog, pick the specific sections they want (lectures, labs, tutorials), arrange them on a weekly calendar, and copy the resulting CRNs (Course Reference Numbers) into UVic's actual registration system
This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance
2. Free tier first: Every architectural decision must keep us inside Cloudflare's free tier.
3. Correctness over features: Schedule conflicts, term codes, CRN lookups, prereq rendering should always be 100% accurate. A wrong schedule is worse than no schedule.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a seperate module. Consistent duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts just by adding local logic to solve a problem.
