---
phase: 04-browse-tours
plan: 01
subsystem: content
tags: [photo-credits, alt-text, seed-data, copy, mongoose, zod, vitest]

requires:
  - phase: 03-design-system-and-app-shell
    provides: the approved copy.md wording and the ui/ component APIs that the Phase 4 strings are checked against
provides:
  - "photoCredits[].alt on the Tour model: optional, trimmed, at most 150 characters (D-15)"
  - "toTourDetail returns a non-empty alt for every credit, with the D-15 fallback"
  - "Phase 4 copy drafts for docs/design/copy.md, held uncommitted until the user approves them"
  - "52 alt-text drafts and two author normalisations for seed/data/tours.json and seed/CREDITS.md, held uncommitted until approval"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10, 04-11, 04-12, 04-13]

# Actuals (#2632). Same estimateTokens scale: chars/4 over the realised diff, committed and uncommitted.
actuals:
  tokens: 11500
  tasks: 1
  commits: 1

# Measured from the commit ledger (#3968), not narrated.
commits: 1
plan_head_before: 2af5517caa4fb89e9209461a7a18ebd4630cb226
plan_head_after: ef94dc4bae6af9c98baf61ac7d5fb660afe14c3f

tech-stack:
  added: []
  patterns:
    - "Alt text is resolved in the DTO (toTourDetail), so no page builds alt text itself (D-15)"

key-files:
  created: []
  modified:
    - src/server/modules/tours/model.ts
    - src/server/modules/tours/dto.ts
    - test/server/modules/tours/model.test.ts
    - test/server/modules/tours/dto.test.ts
    - docs/design/copy.md
    - seed/data/tours.json
    - seed/CREDITS.md

key-decisions:
  - "Alt fallback lives in the DTO (D-15): the cover uses the tour name, any other photo uses its cleaned title. Reversible: one mapper."
  - "Alt length cap is 150 characters in the model, so a pasted caption cannot become a paragraph. Reversible."
  - "Author normalisation (UI-SPEC Open item 4, adopted): both long Wikimedia author sentences become 'Timothy A. Gonsalves' in tours.json and CREDITS.md, pending the user's approval at the Task 2 checkpoint. Reversible: seed data."

patterns-established:
  - "Credit author is plain text everywhere: the seed has no author URL, so only the licence (and on /credits the photo title) links out."

requirements-completed: []  # Empty on purpose: the content gate is not passed. Task 3 sets the completed IDs after approval.

duration: approximate, not measured (start time was not recorded at plan start; about 12:16 to 12:22 IST by the system clock)
completed: 2026-11-16
status: halted
---

# Phase 04 Plan 01: Browse tours content gate, alt text and copy drafts Summary

**Optional photo-credit alt wired from seed to DTO with a tour-name and title fallback, plus Phase 4 copy, 52 alt texts and two credit-author fixes drafted and held for the user's approval at the blocking checkpoint**

## Status

**HALTED at Task 2 (`checkpoint:human-verify`, `gate="blocking-human"`).** Task 1 is committed. Task 3 has not run, because it depends on the user's reply.

Uncommitted drafts (on purpose, per D-15 and the CLAUDE.md approval rule) are in the worktree at `docs/design/copy.md`, `seed/data/tours.json` and `seed/CREDITS.md`. A copy is saved as a patch at `/private/tmp/claude-501/-Users-rithikagarwal-Desktop-natours-claude/fdfdc710-6864-4d29-8302-950e2cebb9f9/scratchpad/04-01-drafts.patch`. The continuation agent should apply the patch after checking that it still matches the worktree, or re-draft from the checkpoint return.

## Performance

- **Duration:** approximate, not measured (about 12:16 to 12:22 IST by the system clock)
- **Started:** not recorded at plan start
- **Completed (checkpoint reached):** 2026-11-16T06:51:46Z
- **Tasks:** 1 of 3 complete (Task 2 is the checkpoint; Task 3 pending)
- **Files modified:** 7 (4 committed, 3 uncommitted drafts)

## Accomplishments

- `photoCredits[].alt` added to the Tour model: optional, trimmed, at most 150 characters (`maxlength: [150, validation.tooLong(150)]`).
- `toTourDetail` returns an `alt` string for every credit. A stored alt is used when non-empty. Otherwise the cover (the credit whose `file` equals `imageCover`) uses the tour name, and any other credit uses its title with `.jpg`, `.jpeg`, `.png` or `.webp` removed (case-insensitive), underscores replaced by spaces, trimmed.
- Four tests added, each tagged `[U27]` or `[U7]`: a 150-character alt passes and 151 fails; a stored alt is returned unchanged; the cover without alt gets the tour name; the gallery title `Pangong_Tso VM.JPG` without alt gets `Pangong Tso VM`.
- Drafted 52 alt texts (one per seed photo, from 512 px thumbnails of each photo viewed in turn). Each is 57 to 104 characters, opens with no "Photo", "Image" or "Picture", does not copy the title, and does not repeat the author or licence.
- Drafted the Phase 4 copy in `docs/design/copy.md`: the Tour list, Tour page, Credits page, Page titles and descriptions, Map attribution and Tour API messages sections. The credits paragraph is rewritten so the author is plain text.
- Drafted the two author normalisations (Thar Desert Camel Safari cover, Spiti Valley Star Gazer photo 3) in `tours.json` and `CREDITS.md`.

## Task Commits

1. **Task 1 (code): alt field end to end, with tests** - `ef94dc4` (`feat(tours): add optional photo credit alt with a tour-name or title fallback [U7, U27] (04-01)`)
2. **Task 1 (drafts): copy, alt texts, author fixes** - not committed (held for approval, D-15)
3. **Task 2: checkpoint, approve wording, alts, author fixes and mapshaper** - checkpoint, no commit
4. **Task 3: commit approved content and data test** - not started

**Plan metadata:** pending. The SUMMARY commit follows this file.

## Files Created/Modified

- `src/server/modules/tours/model.ts` - `PhotoCredit.alt?`, and the `alt` path on `photoCreditSchema`
- `src/server/modules/tours/dto.ts` - `TourPhotoCredit` type, `fallbackAlt` and `altFor`, and `alt` in `toTourDetail`
- `test/server/modules/tours/model.test.ts` - the 150 and 151 character limits
- `test/server/modules/tours/dto.test.ts` - stored alt, cover fallback and gallery title fallback
- `docs/design/copy.md` - (uncommitted) Credits paragraph rewritten; "Phase 4 drafts (awaiting approval, plan 04-01)" section added
- `seed/data/tours.json` - (uncommitted) `alt` on all 52 `photoCredits` entries; two author values normalised
- `seed/CREDITS.md` - (uncommitted) the same two author cells normalised

## Decisions Made

- The alt fallback lives in the DTO, so no page builds alt text itself (D-15).
- The alt cap is 150 characters in the model; drafted alts are 57 to 104 characters.
- The two long author sentences are normalised to "Timothy A. Gonsalves" as UI-SPEC Open item 4 proposes. This is still subject to the user's approval.

## Deviations from Plan

### Tooling and environment (no change to the outcome)

**1. [Rule 3 - Blocking] Dependencies installed in the worktree**
- **Found during:** Task 1, before running the verify commands
- **Issue:** the fresh worktree had no `node_modules`, so vitest and tsc could not run
- **Fix:** `npm ci` from the committed `package-lock.json`. No package was added or changed.
- **Verification:** `npx vitest run` for the two tour test files: 36 passed.

**2. [Rule 3 - Blocking] `next-env.d.ts` created locally (gitignored, not committed)**
- **Found during:** Task 1 type check
- **Issue:** `tsc --noEmit` failed in the fresh worktree with two errors, in `src/app/styleguide/sections/tour-row-section.tsx`, saying the `.jpg` seed images have no type declarations. `next-env.d.ts` is generated by `next dev`/`next build` and is absent in a fresh checkout. The errors predate this plan.
- **Fix:** wrote the standard `next-env.d.ts` reference file in the worktree. It is listed in `.gitignore`, so it is not part of the commit.
- **Verification:** `npx tsc --noEmit` exits 0.

**3. Thumbnails made with `sips`, not `sharp`**
- **Found during:** Task 1, step 5
- **Issue:** the plan names sharp for the 512 px thumbnails. The macOS built-in `sips -Z 512` produces the same thumbnails without loading a dependency.
- **Fix:** thumbnails written to the session scratchpad only, never to the repository.

## Issues Encountered

- The sandbox refused several compound Bash commands that named git inside the worktree. Each was split into plain single commands run from the worktree root. No git operation targeted another checkout.
- **For the reviewer, UI-SPEC inconsistency:** the tour-page cover block says the caption links both the author and the licence ("both linked"), but the strings table and the "Wording differences" rule say the author is plain text. The drafts follow the strings table and the wording rule. Confirm this at the checkpoint.
- **For the reviewer, no next step on the 409 message:** "This tour has bookings, so it can't be deleted." states the problem but names no next step, because Phase 4 has no cancel route. It is flagged in `copy.md`.

## Mapshaper legitimacy

Pending. The user has not answered the `mapshaper@0.6.121` question at the Task 2 checkpoint. Plan 04-08 must not run `npx mapshaper@0.6.121` until this reads "approved". `mapshaper` has not been installed or run in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Blocked on the user's reply to the Task 2 checkpoint. Task 3 applies the approved wording and data, adds `test/scripts/seed-data.test.ts`, and makes the two commits the plan specifies.
- Plans 04-02 to 04-13 must not build any Phase 4 string that is not yet approved in `copy.md`. Plan 04-08 is further blocked by the mapshaper answer.

## Self-Check

Checked before writing this file:

- `src/server/modules/tours/model.ts` contains `maxlength: [150` inside `photoCreditSchema`.
- `npx vitest run test/server/modules/tours/model.test.ts test/server/modules/tours/dto.test.ts`: 36 passed.
- `npx tsc --noEmit`: exit 0 (after the local `next-env.d.ts`, see Deviations).
- `npx eslint` on the four changed TypeScript files: exit 0.
- `grep -c "This Photo was taken"` on `seed/data/tours.json` and `seed/CREDITS.md`: 0 for both.
- The seven required strings are present in `docs/design/copy.md`.
- Commit `ef94dc4` exists and is on the branch.

## Self-Check: PASSED
