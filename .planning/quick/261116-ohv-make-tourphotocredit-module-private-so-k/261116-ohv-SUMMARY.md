---
phase: 04-browse-tours
plan: 261116-ohv
subsystem: tours
status: complete
tags: [knip, types, ci, deferred-items]
requirements: [Q11, D11]
dependency-graph:
  requires: []
  provides:
    - "TourPhotoCredit is module-private, so knip reports no unused exported types"
  affects:
    - "src/server/modules/tours/dto.ts"
    - ".planning/phases/04-browse-tours/deferred-items.md"
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/server/modules/tours/dto.ts
    - .planning/phases/04-browse-tours/deferred-items.md
decisions:
  - "Dropped the export keyword instead of deleting the type: TourDetail.photoCredits uses it in the same file."
  - "No re-export added for plans 04-06 or 04-10; a later plan that adds an importer re-exports it then."
metrics:
  duration: "about 15 min"
  completed: "2026-11-16"
  tasks: 2
  files: 2
plan_head_before: c5ad1223af894919689a75d1e683eaa6b0af5a3f
plan_head_after: e4563c2a9ddb917aa8a20a709e64ab168091db6d
commits: 2
actuals:
  tasks: 2
  commits: 2
---

# Phase 04 Plan 261116-ohv: Make TourPhotoCredit module-private so knip passes Summary

One-liner: Dropped the `export` keyword from `TourPhotoCredit` in dto.ts so the CI checks job's knip step passes, and marked the matching deferred item resolved.

## What Changed

- `src/server/modules/tours/dto.ts`: `TourPhotoCredit` is declared without `export`. The type body, its doc comment and `TourDetail.photoCredits` are unchanged. Prettier reflowed the alias onto fewer lines (see Deviations).
- `.planning/phases/04-browse-tours/deferred-items.md`: the `TourPhotoCredit` entry changed from `status: open` to `status: resolved` and cites quick task 261116-ohv.

## Commits

- `be9f02b` fix(tours): make TourPhotoCredit module-private so knip passes [Q11, D11] (quick-261116-ohv)
- `e4563c2` docs(planning): mark the TourPhotoCredit deferred item resolved [Q11] (quick-261116-ohv)

## Verification

- `npx knip`: no output, exit 0 (baseline was `Unused exported types (1)`).
- `npx tsc --noEmit`: exit 0 (after copying the gitignored `next-env.d.ts` into the worktree).
- `npx prettier --check src/server/modules/tours/dto.ts`: passes.
- `npx eslint --max-warnings=0 src/server/modules/tours/dto.ts`: exit 0.
- `npm test`: 65 files, 829 tests passed.
- `grep -rn TourPhotoCredit src test scripts docs`: two hits in dto.ts (declaration and `TourDetail.photoCredits`), same as baseline.
- `git diff --stat c5ad122 -- plan.md package.json package-lock.json`: empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prettier reflow of the TourPhotoCredit alias**
- **Found during:** Task 1 verification
- **Issue:** With `export` removed, `npx prettier --check` failed on dto.ts. Prettier wants the alias on one line (`type TourPhotoCredit = Omit<...> & {` / `alt: string;` / `};`) instead of the previous wrapped form. The plan's verify command requires prettier to pass.
- **Fix:** Re-laid out only that three-line declaration by hand to match prettier's output. No other line changed. Did not run `prettier --write` across the repo.
- **Files modified:** src/server/modules/tours/dto.ts
- **Commit:** be9f02b

### Environment Setup (not code changes)

- `node_modules` was missing in the worktree, so `npm ci` was run. Nothing it changed is committed.
- `next-env.d.ts` (gitignored) was copied from the main checkout. Without it, `tsc --noEmit` failed on the seed `.jpg` imports in `src/app/styleguide/sections/tour-row-section.tsx`. It is not committed.

## Known Stubs

None.

## Threat Flags

None. The change is type-level only; no runtime path, data shape or dependency changed.

## Self-Check: PASSED

- FOUND: src/server/modules/tours/dto.ts (modified, committed in be9f02b)
- FOUND: .planning/phases/04-browse-tours/deferred-items.md (modified, committed in e4563c2)
- FOUND: commit be9f02b in branch history
- FOUND: commit e4563c2 in branch history
- Ledger note: the plan-commit ledger file under the worktree's git admin directory was not writable (path guard refused it). `commits` and `plan_head_before` were measured from the base commit recorded at the start of the run instead.
