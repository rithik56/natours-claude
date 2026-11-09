# 0002. GSD replaces the agent team

Status: Accepted
Date: 9 Nov 2026
Requirements: Q8, Q11
Plan review: DEL-01, DEL-05, DEL-06, DEL-07, DEL-08, DEL-23

## Context

`plan.md` §11 and §14 describe a team of seven agent sessions, with a file-ownership map (§11.1), workflow rules (§11.2) and task IDs (§12) such as P1-CA4. The plan review found that this process has its own problems: DEL-01 (a Blocker) and DEL-05 to DEL-08 are about how the team coordinates, and DEL-23 notes that `CLAUDE.md` and `plan.md` word some rules in conflicting ways.

One person is building this project to learn Next.js 16 and AI-assisted development. A seven-session team doesn't fit that, and the project already uses GSD for its phases and plans.

## Decision

GSD phases and executors replace the seven-teammate agent team (§11 and §14). As a result:

- The §11.1 file-ownership map and the §12 task IDs no longer apply. Work is organised as phases in `.planning/ROADMAP.md` and plans in `.planning/phases/`.
- Requirement IDs from `plan.md` are reused unchanged and are listed in `.planning/REQUIREMENTS.md` (see ADR 0003).
- Commits follow Conventional Commits and cite both the requirement IDs they cover and the GSD plan. The IDs go in square brackets after the summary and the plan number goes last, in brackets: `type(scope): summary [IDs] (NN-NN)`. For example: `feat(session): pin HS256 and reject stale tokens [S14, B14] (01-09)`. This amends Q8, which asked for task IDs. GSD's own planning commits, such as `docs(01): ...`, may omit the IDs.
- A commit that adds a dependency gives a one-line reason for each new package in its body (Q11).
- `CLAUDE.md` is rewritten to say this, and no longer mentions file ownership, task IDs or a coordinating agent.

## Consequences

- Every executor reads one `CLAUDE.md` that matches how the project is actually built.
- A commit can be traced to `.planning/REQUIREMENTS.md` through its IDs and to its plan through the plan number. A later check in plan 01-15 verifies the type format of every commit in the phase.
- The agent-team findings (DEL-01, DEL-05 to DEL-11, DEL-13, DEL-14, DEL-19, DEL-21 and DEL-25) no longer apply and are not handled.
- Anything in `plan.md` that refers to a teammate, a task ID or a file owner is read as a pointer to the matching requirement or phase.
