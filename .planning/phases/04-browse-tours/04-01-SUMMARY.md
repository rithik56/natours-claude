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
  - "Phase 4 wording approved and committed in docs/design/copy.md (16 Nov 2026)"
  - "52 approved alt texts and two normalised credit authors in seed/data/tours.json and seed/CREDITS.md"
  - "test/scripts/seed-data.test.ts: U27 credit coverage, alt presence and author agreement over the seed files"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10, 04-11, 04-12, 04-13]

# Actuals (#2632). Same estimateTokens scale: chars/4 over the realised diff of this plan's commits.
actuals:
  tokens: 15100
  tasks: 3
  commits: 4

# Measured from the commit ledger (#3968), not narrated. Taken before this SUMMARY's own commit.
commits: 4
plan_head_before: 2af5517caa4fb89e9209461a7a18ebd4630cb226
plan_head_after: d9bd591

tech-stack:
  added: []
  patterns:
    - "Alt text is resolved in the DTO (toTourDetail), so no page builds alt text itself (D-15)"
    - "Credit author is plain text everywhere: the seed has no author URL, so only the licence (and on /credits the photo title) links out"

key-files:
  created:
    - test/scripts/seed-data.test.ts
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
  - "Author normalisation: both long Wikimedia author sentences became 'Timothy A. Gonsalves' in tours.json and CREDITS.md, approved by the user on 16 Nov 2026. Reversible: seed data."
  - "Captions and credit lists show the author as plain text; only the licence links (and on /credits the photo title), following the UI-SPEC strings table and wording rule."

patterns-established:
  - "Phase 4 strings come only from docs/design/copy.md, and each was approved there before it was built"

requirements-completed: [U7, U27, U10, U11, R10]

duration: approximate, not measured (start time was not recorded at plan start; about 12:16 to 12:30 IST by the system clock across both sessions)
completed: 2026-11-16
status: complete
---

# Phase 04 Plan 01: Browse tours content gate, alt text and approved copy Summary

**Optional photo-credit alt wired from seed to DTO with a tour-name and title fallback, plus Phase 4 copy, 52 alt texts and two credit-author normalisations approved by the user on 16 Nov 2026 and committed with a seed data test**

## Status

**Complete.** The user approved the Task 2 checkpoint on 16 Nov 2026 with the reply "approved with mapshaper approved". Every draft was accepted as written, with no wording changes. Task 3 then applied the approved content, added the data test, and made the two commits the plan names.

## Performance

- **Duration:** approximate, not measured (start time was not recorded at plan start)
- **Started:** not recorded at plan start
- **Checkpoint reached:** 2026-11-16T06:51:46Z
- **Completed:** 2026-11-16 (Task 3 after approval)
- **Tasks:** 3 of 3 complete
- **Files modified:** 8 (7 modified, 1 created)

## Accomplishments

- `photoCredits[].alt` added to the Tour model: optional, trimmed, at most 150 characters (`maxlength: [150, validation.tooLong(150)]`).
- `toTourDetail` returns an `alt` string for every credit. A stored alt is used when non-empty. Otherwise the cover (the credit whose `file` equals `imageCover`) uses the tour name, and any other credit uses its title with `.jpg`, `.jpeg`, `.png` or `.webp` removed (case-insensitive), underscores replaced by spaces, trimmed.
- Four model and DTO tests, each tagged `[U27]` or `[U7]`: a 150-character alt passes and 151 fails; a stored alt is returned unchanged; the cover without alt gets the tour name; the gallery title `Pangong_Tso VM.JPG` without alt gets `Pangong Tso VM`.
- 52 alt texts approved and applied: one per seed photo, each 57 to 104 characters, opening with no "Photo", "Image" or "Picture", not copying the title, and not repeating the author or licence.
- Phase 4 wording approved and committed in `docs/design/copy.md`: Tour list, Tour page, Credits page, Page titles and descriptions, Map attribution and Tour API messages. The credits paragraph now makes the author plain text.
- Two credit authors normalised to "Timothy A. Gonsalves" in `seed/data/tours.json` and `seed/CREDITS.md`.
- `test/scripts/seed-data.test.ts` adds five `[U27]` tests over the seed files: credit coverage matches each tour's cover and gallery; every credit has its required fields; every alt is 1 to 125 characters and does not open with Photo, Image or Picture; no author exceeds 60 characters; `CREDITS.md` lists every tour photo with the same author as `tours.json`.

## Task Commits

1. **Task 1 (code): alt field end to end, with tests** - `ef94dc4` (`feat(tours): add optional photo credit alt with a tour-name or title fallback [U7, U27] (04-01)`)
2. **Task 1 (drafts) and Task 2 checkpoint** - approved by the user on 16 Nov 2026, no commit at the checkpoint
3. **Task 1 (drafts) approved wording** - `7f8c1c8` (`docs(copy): add approved Phase 4 wording [U20, U10, U11, U27, R10] (04-01)`)
4. **Task 3: approved seed content and data test** - `d9bd591` (`feat(seed): add approved alt text and normalise two photo credits [U7, U27] (04-01)`)
5. **Halt record** - `cf20457` (`docs(04-01): record plan halted at the content checkpoint [U7, U27, R10] (04-01)`), superseded by this file. The final SUMMARY commit follows.

**Plan metadata:** the SUMMARY commit that carries this file.

## Files Created/Modified

- `src/server/modules/tours/model.ts` - `PhotoCredit.alt?`, and the `alt` path on `photoCreditSchema`
- `src/server/modules/tours/dto.ts` - `TourPhotoCredit` type, `fallbackAlt` and `altFor`, and `alt` in `toTourDetail`
- `test/server/modules/tours/model.test.ts` - the 150 and 151 character limits
- `test/server/modules/tours/dto.test.ts` - stored alt, cover fallback and gallery title fallback
- `test/scripts/seed-data.test.ts` - created; U27 guards over the seed files, no database
- `docs/design/copy.md` - Credits paragraph rewritten; "Phase 4 wording (approved 16 Nov 2026, plan 04-01)" section added
- `seed/data/tours.json` - `alt` on all 52 `photoCredits` entries; two author values normalised
- `seed/CREDITS.md` - the same two author cells normalised

## Decisions Made

- The alt fallback lives in the DTO, so no page builds alt text itself (D-15).
- The alt cap is 150 characters in the model; approved alts are 57 to 104 characters.
- The two long author sentences are normalised to "Timothy A. Gonsalves", as UI-SPEC Open item 4 proposed and the user approved.
- Captions and credit lists show the author as plain text, and only the licence links (and on `/credits` the photo title), following the UI-SPEC strings table and its wording rule. The user confirmed this at the checkpoint.

## Deviations from Plan

### Tooling and environment (no change to the outcome)

**1. [Rule 3 - Blocking] Dependencies installed in the worktree**
- **Found during:** Task 1, before running the verify commands
- **Issue:** the fresh worktree had no `node_modules`, so vitest and tsc could not run
- **Fix:** `npm ci` from the committed `package-lock.json`. No package was added or changed.
- **Verification:** the tour test files and the seed data test pass.

**2. [Rule 3 - Blocking] `next-env.d.ts` created locally (gitignored, not committed)**
- **Found during:** Task 1 type check
- **Issue:** `tsc --noEmit` failed in the fresh worktree with two errors, in `src/app/styleguide/sections/tour-row-section.tsx`, saying the `.jpg` seed images have no type declarations. `next-env.d.ts` is generated by `next dev`/`next build` and is absent in a fresh checkout. The errors predate this plan.
- **Fix:** wrote the standard `next-env.d.ts` reference file in the worktree. It is listed in `.gitignore`, so it is not part of any commit.
- **Verification:** `npx tsc --noEmit` exits 0.

**3. Thumbnails made with `sips`, not `sharp`**
- **Found during:** Task 1, step 5
- **Issue:** the plan names sharp for the 512 px thumbnails. The macOS built-in `sips -Z 512` produces the same thumbnails without loading a dependency.
- **Fix:** thumbnails written to the session scratchpad only, never to the repository.

**Total deviations:** 3 tooling or environment (all Rule 3 or tooling, none changing the approved content). **Impact on plan:** none on the outcome; no scope creep.

## Issues Encountered

- The sandbox refused several compound Bash commands that named git inside the worktree. Each was split into plain commands run from the worktree root. No git operation targeted another checkout.
- After approval, the 409 note in `copy.md` was reworded to record the approval, with the same message. The message itself is unchanged.

## Mapshaper legitimacy

approved. The user's reply at the Task 2 checkpoint, verbatim: "approved with mapshaper approved" (16 Nov 2026). The user checked the package themselves: the publisher is mbloch, the repository is github.com/mbloch/mapshaper, and version 0.6.121 exists on npmjs.com. Plan 04-08 may run `npx mapshaper@0.6.121` once, as a one-off, and never install it as a dependency. The package was not installed or run in this plan.

## Checkpoint outcome

On 16 Nov 2026 the user approved all drafts as written. Approved items:
- Every Phase 4 row in `docs/design/copy.md`, including the 409 delete message "This tour has bookings, so it can't be deleted."
- The 52 alt texts, as drafted.
- The author normalisation to "Timothy A. Gonsalves" for the two long author sentences.
- The caption and credit-list wording: the author is plain text, and only the licence links.
- The mapshaper@0.6.121 check, recorded above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Phase 4 wording and seed credit data are approved and committed. Plans 04-02 to 04-13 may build the strings recorded in `copy.md`.
- Plan 04-08 may run the mapshaper one-off, since the legitimacy answer is recorded above.
- The 409 message has no next step, because Phase 4 has no cancel route. Name it once Phase 6 defines the flow.

## Self-Check

Checked against the worktree before this file was written:

- `test/scripts/seed-data.test.ts`, `seed/data/tours.json`, `seed/CREDITS.md`, `docs/design/copy.md` and `src/server/modules/tours/model.ts` exist.
- Commits `ef94dc4`, `cf20457`, `7f8c1c8` and `d9bd591` are ancestors of HEAD.
- `npx vitest run test/scripts/seed-data.test.ts test/server/modules/tours/dto.test.ts`: 17 passed.
- `npx vitest run test/server/modules/tours/model.test.ts test/server/modules/tours/dto.test.ts`: 36 passed (earlier run, unchanged since).
- `npx tsc --noEmit`: exit 0.
- `npx eslint` on the changed TypeScript files: exit 0.
- `npm run check:conventions`: exit 0.
- `grep -c "This Photo was taken"` on `seed/data/tours.json` and `seed/CREDITS.md`: 0 for both.
- The copy approval heading is present in `docs/design/copy.md`.
- `git log -2` subjects both end in `(04-01)`, and the worktree is clean.

## Self-Check: PASSED
