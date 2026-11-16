---
phase: 04-browse-tours
plan: 07
subsystem: ui
tags: [tour-page, booking-panel, reviews, guides, suspense, streaming, cache, playwright, adr-0033]

# Dependency graph
requires:
  - phase: 04-06
    provides: the tour page and its aside slot, getBySlug, getGuides, TourDetail.guideIds
  - phase: 04-04
    provides: the cached catalogue, and the seeded database the Playwright project runs on
provides:
  - "BookingSection: the signed-in traveller's booking state, streamed behind a skeleton and never cached (R5)"
  - "findUpcomingPaid(userId, tourId, durationDays): the IST day of the earliest upcoming paid booking, or null (QA-06, QA-07, SEC-07)"
  - "bookingPanelProps: the four panel states chosen from the data alone (U11)"
  - "C1: the booking panel is a block in the page flow below 64em and sticky from 64em, with a matching skeleton"
  - "GuidesSection and ReviewsSection behind same-sized skeletons, with their headings outside the boundaries (R4)"
  - "listForTour(tourId, page): the whole review list cached under ['reviews', tourId] and paged five at a time (D-08)"
  - "The reviewPage query parameter: digits only, at least 1, clamped to the last page (T-04-22)"
  - "ADR 0033 and the booking, guides and reviews contracts in docs/contracts.md section 11"
affects:
  - "04-08 and the rest of phase 4 build on this page's sections; the open decision below changes their structure, so they wait for it"
  - "Phase 6: the write path that invalidates reviews:<tourId>, and the booking state that Checkout will read"

# Actuals (#2632): the estimate was 100000 tokens over 3 tasks.
# Same chars/4 scale as the estimate, measured over the 26 files changed since the base at HEAD (155170 characters).
actuals:
  tokens: 38792
  tasks: 3
  commits: 6
# Measured from the base the worktree was created on (git rev-list --count a9ea147..HEAD).
plan_head_before: a9ea1478a8c3583bd8aaa7b175a01df2f675d75d
plan_head_after: 555ad5b

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The booking read is outside every cached function and takes its user id only from getCurrentUser() (R5)"
    - "Services import only their own model; the reviews service populates the author by name, so the users model is registered by the session graph (ARC-08)"
    - "Each streamed section awaits only its own data; the headings it sits under stay outside its Suspense boundary"
    - "A streamed list and its fallback share one CSS class, so the skeletons and the real items take the same box"
    - "Page parameters read leniently through parseQuery, and clamped in the service"

key-files:
  created:
    - src/server/modules/bookings/service.ts
    - src/components/features/booking-state.ts
    - src/components/features/booking-section.tsx
    - src/components/features/guides-section.tsx
    - src/components/features/guides-section.module.css
    - src/components/features/reviews-section.tsx
    - src/components/features/reviews-section.module.css
    - src/server/modules/reviews/service.ts
    - src/server/modules/reviews/schemas.ts
    - docs/adr/0033-booking-panel-in-the-page-flow.md
    - test/server/modules/bookings/service.test.ts
    - test/server/modules/reviews/service.test.ts
    - test/components/features/booking-state.test.ts
    - test/components/features/booking-section.test.ts
    - test/components/features/reviews-section.test.ts
    - test/components/features/guides-section.test.ts
  modified:
    - src/app/tour/[slug]/page.tsx
    - src/app/tour/[slug]/page.module.css
    - src/components/ui/booking-panel.module.css
    - src/components/ui/skeleton.module.css
    - test/app/booking-panel.spec.ts
    - test/app/tour-page.spec.ts
    - test/helpers/factories.ts
    - docs/adr/README.md
    - docs/contracts.md
    - .planning/phases/04-browse-tours/deferred-items.md

key-decisions:
  - "findUpcomingPaid returns the IST day of the earliest upcoming paid booking, not the boolean plan.md 4.4 names, because the panel prints the date (ADR 0033)"
  - "Booked means an upcoming paid booking: refunded bookings never count, and a paid trip that has ended does not make the tour booked (QA-06, QA-07, SEC-07)"
  - "The panel's state order is no-dates, booked, logged-out, bookable, as the plan's contract lists them"
  - "Below 64em the booking panel is in the page flow, not pinned to the bottom of the screen (D-06, C1, ADR 0033)"
  - "The reviews are cached as one list under ['reviews', tourId]; the page number only slices it in memory (D-08, T-04-22)"
  - "A review whose author was deleted is skipped with a logged warning; a deactivated author's review stays (B12, RESEARCH A9)"
  - "Streaming is kept as the plan wrote it for now. With JavaScript off it leaves the skeletons in place, which is the open decision below"

patterns-established:
  - "Pattern: the streamed list and its fallback are exported from the same component file and share one CSS class"
  - "Pattern: a held check is written as test.fixme with its reason in the file and in the contracts, so it is visible and cannot pass by accident"

requirements-completed: [U11, R4, R3, B12]  # copied verbatim from the PLAN; the status is halted, so U11, R4 and B12 are not complete (see the checkpoint)

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "The booking panel shows the signed-in traveller's own state, read on every request and never cached; two travellers on one tour each see their own"
    requirement: U11
    verification:
      - kind: unit
        ref: "test/components/features/booking-section.test.ts#[U11] two travellers on the same tour each see their own state, from the same server"
        status: pass
      - kind: integration
        ref: "test/server/modules/bookings/service.test.ts#[U11] an upcoming paid booking returns the IST day it starts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A refunded booking and a past paid trip never make the tour booked; a past traveller may book again (QA-06, QA-07, SEC-07)"
    requirement: U11
    verification:
      - kind: integration
        ref: "test/server/modules/bookings/service.test.ts#[QA-06] a refunded booking never counts, however far ahead its trip is"
        status: pass
      - kind: integration
        ref: "test/components/features/booking-section.test.ts#[U11] a traveller whose only paid trip is past is offered the bookable state again"
        status: pass
    human_judgment: false
  - id: D3
    description: "The panel's four states, with the start dates in ascending IST order and a start date on today's day not listed"
    requirement: U11
    verification:
      - kind: unit
        ref: "test/components/features/booking-state.test.ts#[U11] a start date whose IST day equals today is not listed, and tomorrow's is"
        status: pass
    human_judgment: false
  - id: D4
    description: "The booking panel is a block in the page flow below 64em with no pinned bar, sticky at top space-5 from 64em, and its skeleton has the same height as the panel"
    requirement: R4
    verification:
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[U11] at 375px the panel is a block in the page flow, straight after the facts strip, and not pinned"
        status: pass
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[R4] at 375px the booking-panel skeleton has the same box as the bookable panel"
        status: pass
    human_judgment: true
    rationale: "The look of the panel against the approved direction at 375px and 1280px, in light and dark themes, has not been checked by a person (Task 3 human-check)."
  - id: D5
    description: "The guides list shows the lead guide first as Lead guide and the others as Guide, behind two skeletons, with its heading outside the boundary"
    requirement: B12
    verification:
      - kind: unit
        ref: "test/components/features/guides-section.test.ts#[B12] the lead guide is labelled Lead guide"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/service.test.ts#[B12] puts the lead guide first, even when the tour lists him second"
        status: pass
    human_judgment: true
    rationale: "The guides list with JavaScript off is held (test.fixme): with scripts off only the skeletons show. The decision below decides how it renders."
  - id: D6
    description: "Reviews are listed newest first, five to a page, and paged by reviewPage with the page clamped; a page number creates no cache entry"
    requirement: B12
    verification:
      - kind: unit
        ref: "test/server/modules/reviews/service.test.ts#[D-08] with six reviews, page 1 holds the five newest and page 2 holds the oldest"
        status: pass
      - kind: unit
        ref: "test/server/modules/reviews/service.test.ts#[T-04-22] only the full list is cached under [\"reviews\", tourId], so a page number creates no cache entry"
        status: pass
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[D-08] /tour/ladakh-high-passes?reviewPage=999999#reviews renders the Reviews heading with no error"
        status: pass
    human_judgment: false
  - id: D7
    description: "The Review pagination nav appears only with more than five reviews, links to reviewPage with #reviews, and says No reviews yet. for an empty tour"
    requirement: U11
    verification:
      - kind: unit
        ref: "test/components/features/reviews-section.test.ts#[D-08] a tour with more than five reviews shows Review pagination, whose Next link carries reviewPage and returns to #reviews"
        status: pass
    human_judgment: true
    rationale: "Paging without JavaScript is held (test.fixme): the pagination links are in the streamed content, which is hidden with scripts off. The decision below decides it."
  - id: D8
    description: "The tour page's layout shift after load is under 0.1 at 1280px; at 375px it is held because the site header shifts the page on every route"
    requirement: R4
    verification:
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[R4] at 1280px the layout shift after load is under 0.1"
        status: pass
    human_judgment: true
    rationale: "The 375px check is test.fixme: 0.139 on /, on /styleguide and on the tour page alike, from the header's hydration (deferred-items.md). Not resolved here."
  - id: D9
    description: "ADR 0033 and the booking, guides and reviews contracts in docs/contracts.md, with the two plan.md 4 differences recorded"
    requirement: U11
    verification:
      - kind: other
        ref: "npm run format:check passes; docs/adr/README.md lists 0033"
        status: pass
    human_judgment: true
    rationale: "The wording of the ADR and the contract is for a reader to check; no test reads it."

# Deliberate deviations and the TDD record are in the body below.
---

# Phase 4 Plan 07: Booking panel, guides and reviews Summary

**The booking panel streams the signed-in traveller's own state, and the guides and paged reviews stream behind same-sized skeletons; with JavaScript off the streamed parts stay as skeletons, so the plan halts here for a decision.**

## Status: halted at a decision

Tasks 1 and 2 are complete and committed. Task 3 is complete except for the checks that depend on the streaming decision below, and one human check. Nothing in the completed work needs to be reverted whichever option is chosen, but the page's structure may change. The orchestrator should not dispatch 04-08 or the rest of phase 4 until the decision is made.

## Performance

- **Duration:** about 25 min (approximate; the start was not recorded, the first test run was at 18:43 IST, the last commit at 19:01 IST)
- **Started:** 2026-11-16, about 18:38 IST (approximate)
- **Completed:** halted 2026-11-16 at the checkpoint
- **Tasks:** 3 started; Task 1 and Task 2 done, Task 3 partly done
- **Commits:** 6 since the base (3 task commits, the RED commit, 1 knip refactor, 1 docs commit), plus this SUMMARY
- **Files:** 26 changed since the base

## Accomplishments

- **Task 1 (tracer), done.** `findUpcomingPaid` reads the signed-in traveller's upcoming paid bookings on every request, outside every cache. Refunded bookings and ended trips do not count. `bookingPanelProps` chooses the four states from the data. `BookingSection` streams behind a `booking-panel` skeleton with no local catch, so an outage reaches the error page. C1 is in: the panel is a bordered block in the page flow below 64em and sticky from 64em, and its skeleton has the same height at both widths.
- **Task 2 (TDD), done.** `listForTour` reads a tour's reviews once under `['reviews', tourId]`, newest first, with each author reduced to name, photo and role. It pages five at a time in memory and clamps `reviewPage`. A deleted author is skipped with a logged warning. `GuidesSection` shows the lead guide first. Both lists stream behind skeletons in the same class as the real list, and their headings sit outside the boundary.
- **Task 3, partly done.** ADR 0033 and the contracts are written. The 1280px layout-shift check passes, the reviewPage clamp is proven in the browser, and the booking skeleton is measured against the panel.

## Checkpoint: a decision is needed before this plan can finish

**What was found.** With JavaScript off, the streamed sections never show their content. React writes each streamed boundary's content into a `div[hidden]` container, and an inline script moves it into place. With scripts off the skeleton stays. Measured on `/tour/ladakh-high-passes` with JavaScript disabled:

- `#reviews` contains only its heading. The four review skeletons have no text.
- The guides list contains only its heading.
- The booking panel's content (dates, price, "Log in to book") is in the HTML, inside one of three `div[hidden]` stream containers, so it is not shown.

**The conflict.** These requirements cannot all hold with Suspense boundaries as built:

- plan.md R4 puts reviews, guides and the booking state inside `<Suspense>`.
- plan.md R11 lists the tour page among the things that work without JavaScript.
- D-08 says reviews are paged "through a query parameter ... work without JavaScript".
- The UI spec's JavaScript-off list says the booking panel shows its server-rendered state.
- This plan's Task 3 requires the booking panel, guides and reviews to appear with JavaScript off.

**Options.**

- **A. Keep streaming as written.** JavaScript-off visitors see skeletons for the booking panel, the guides and the reviews, and cannot page reviews. Requires an ADR amending D-08, R11 and the UI spec's JavaScript-off list. This is the smallest code change.
- **B. Keep Suspense for the booking panel only; await guides and reviews in the page.** Guides, reviews and paging work without JavaScript. The booking panel still streams, so a logged-out JavaScript-off visitor does not see the login link. Requires an ADR amending R4 for guides and reviews.
- **C. Await all three in the page, with no Suspense on this page.** Everything works without JavaScript. The three reads run in parallel before the first byte is sent, all are local or uncached, and the booking read stays uncached (R5). Requires an ADR amending R4 for this page.

**Recommendation.** Option C. It is the only one that meets R11, D-08 and the JavaScript-off checks at once, its cost is three reads that already run in parallel, and R4's aim (no layout shift) holds because nothing is shown before it is ready. Option B is the fallback if the booking state should keep streaming.

**Impact.** Options B and C change `src/app/tour/[slug]/page.tsx` and the `Suspense` boundaries in it. They also need an ADR. Under each option the three held JavaScript-off tests in `test/app/tour-page.spec.ts` become plain tests, and under C and B they are expected to pass. Option A keeps the held tests as they are, with the ADR recording the gap.

**To resume.** Choose one option. A continuation then changes the page as the option requires, changes the three `test.fixme` JavaScript-off tests to plain tests, runs the browser specs, carries out the held human check, and rewrites this SUMMARY with `status: complete`.

## Held checks

- **Three JavaScript-off tests, `test.fixme`:** the booking panel's login link and dates, the guides list, and the reviews with their pagination nav. Each asserts real content, not skeletons. Reason: the decision above.
- **The 375px layout-shift test, `test.fixme`:** 0.139 on every route, including `/styleguide` where nothing streams. The cause is the site header's height changing when its mobile menu hydrates (recorded in `deferred-items.md`). Phase 3's shell, not this plan.
- **Human check (Task 3):** the tour page at 375px and 1280px, light and dark, has not been reviewed by a person against the approved mockups. Not performed.

## Task Commits

1. **Task 1 (tracer): booking panel streams the signed-in traveller's own state** - `5eddc86` (feat)
2. **Task 2 (RED): failing tests for review paging, the reviews list and guide labels** - `7712016` (test)
3. **Task 2 (GREEN): guides and paginated reviews stream behind same-sized skeletons** - `0cfce03` (feat)
4. **Task 3: the streamed tour page's layout shift at 1280px, its Reviews text and the clamped reviewPage** - `e7df9cc` (test)
5. **Refactor: keep the reviews page size module-private, as knip requires** - `d4f58ea` (refactor)
6. **Task 3 docs: ADR 0033 and the booking, guides and reviews contracts** - `555ad5b` (docs)

**Plan metadata:** this SUMMARY, committed after the task commits. STATE.md, ROADMAP.md and REQUIREMENTS.md are left to the orchestrator.

## TDD record

- **Task 2 RED:** commit `7712016`. The three new test files (`reviews/service`, `reviews-section`, `guides-section`) were run before any implementation existed. They failed at module load (`Cannot find package '@/server/modules/reviews/service'`, and the same for the two components), not on an assertion. tdd.md's classifier treats a load failure as INVALID_RED, so this RED is weaker than the reference asks for. It is disclosed here rather than hidden. The classifier (`gsd_run check tdd-red-evidence`) was not run, because `workflow.tdd_mode` is `false` in `.planning/config.json`.
- **Task 2 GREEN:** commit `0cfce03`. All 15 tests passed on the first run.

## Files Created/Modified

- `src/server/modules/bookings/service.ts` - `findUpcomingPaid`; uncached; the user id comes from the session only
- `src/components/features/booking-state.ts` - `bookingPanelProps`, a pure state chooser
- `src/components/features/booking-section.tsx` - the streamed booking panel, with no try/catch
- `src/server/modules/reviews/service.ts` - `listForTour`, cached once under `['reviews', tourId]`, tagged `reviews:<tourId>`, paged five at a time
- `src/server/modules/reviews/schemas.ts` - `reviewPageQuerySchema` (added; not in the plan's file list)
- `src/components/features/guides-section.tsx`, `guides-section.module.css` - `GuidesSection`, `GuidesFallback`, `guideRoleLabel`; the CSS module is added and not in the plan's file list
- `src/components/features/reviews-section.tsx`, `reviews-section.module.css` - `ReviewList`, `ReviewsSection`, `ReviewsFallback`
- `src/app/tour/[slug]/page.tsx` and `page.module.css` - the booking slot behind its skeleton, the guides and reviews sections between the photos and the credits, the `reviewPage` read, the `#reviews` anchor offset
- `src/components/ui/booking-panel.module.css`, `skeleton.module.css` - C1: the panel in the page flow below 64em, sticky from 64em; the booking skeleton copies its box
- `docs/adr/0033-booking-panel-in-the-page-flow.md`, `docs/adr/README.md` - the D-06 deviation and the booked contract
- `docs/contracts.md` - the two plan.md 4 differences; section 10 rows marked done; section 11 for this plan, with the open item
- `.planning/phases/04-browse-tours/deferred-items.md` - the header shift
- Tests: `test/server/modules/bookings/service.test.ts`, `test/server/modules/reviews/service.test.ts`, `test/components/features/booking-state.test.ts`, `booking-section.test.ts`, `reviews-section.test.ts`, `guides-section.test.ts`; `test/app/booking-panel.spec.ts`, `test/app/tour-page.spec.ts`; `test/helpers/factories.ts` (`createReview` takes `createdAt`)

## Decisions Made

- `findUpcomingPaid` returns the IST day, not a boolean, because the panel prints the date. Recorded in ADR 0033 and the contracts.
- "Booked" means an upcoming paid booking. A refunded booking and a trip that has ended do not count.
- The panel's state order is no-dates, booked, logged-out, bookable, as the plan lists them. A traveller whose only upcoming start date is on today or before it therefore sees "No upcoming start dates" even with a booking.
- The reviews service does not import the users model, to keep ARC-08. The populate on `user` relies on the users model being registered by the session graph, which the tour page always loads. A test of the reviews service imports the factories, which do register it.
- A review whose author was deleted is skipped with a logged warning. A deactivated author's review stays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dependencies were not installed in the worktree**
- **Found during:** setup
- **Issue:** `node_modules` was missing.
- **Fix:** `npm ci` against the committed lockfile (ADR 0004). No package was added or changed.
- **Committed in:** not committed (environment only)

**2. [Rule 3 - Blocking] `next-env.d.ts` was missing, so typecheck reported `PageProps` and image-module errors**
- **Found during:** baseline typecheck
- **Fix:** `npx next typegen`. The file is gitignored.
- **Committed in:** not committed (environment only)

**3. [Rule 3 - Blocking] Port 3000 is served by another session's dev server, so the browser run used an isolated server**
- **Found during:** the first Playwright run
- **Issue:** `playwright.config.ts` reuses an existing server on port 3000. That server is a `next-server` process started at 18:33 from the main checkout `/Users/rithikagarwal/Desktop/natours-claude` (PID 41976), not from this worktree. Reusing it would have tested the other checkout's code.
- **Fix:** I did not touch that process. The browser runs used a scratch Playwright config outside the repository. It starts `next dev` from this worktree on port 3100, with its own database `natours-wt-ac4d83b375`, and pins the clock to 2026-11-08 as the repo config does.
- **Committed in:** not committed (scratch config lives in the session scratchpad)

**4. [Rule 3 - Blocking] knip flagged `REVIEWS_PER_PAGE` as an unused export**
- **Fix:** made it module-private. Commit `d4f58ea`.

### Scope and design decisions (not auto-fixes)

- **`src/server/modules/reviews/schemas.ts` was added,** following `tours/schemas.ts`. It holds the `reviewPage` schema. It is not in the plan's file list.
- **`src/components/features/guides-section.module.css` was added** for the guides list's box, which the plan's file list omits. The page uses the fallback from the same component, so the skeletons and the real list take the same class.
- **The fallbacks are exported components** (`GuidesFallback`, `ReviewsFallback`) rather than inline JSX in the page. The markup is the one the plan describes.
- **`generateMetadata` takes `params` only.** It does not read `searchParams`, so its existing metadata test still holds.
- **The styleguide skeleton check compares heights, not widths.** The styleguide lays each state out as a flex row, so each box is sized to its content: the panel is 9.8px wider than its skeleton there, at both widths, with the same height. On the tour page both are the column width. The spec comment says so.
- **The paging proof with four plus two reviews is at the service level** (`test/server/modules/reviews/service.test.ts`), not in the browser. The browser has no write path for reviews before Phase 6, and a direct database write would sit behind the real cache.

### Held and not done

- The three JavaScript-off tests and the 375px layout-shift test are `test.fixme`. See "Held checks" and the checkpoint.
- The human check in Task 3 was not performed.

**Total deviations:** 4 auto-fixed (all Rule 3, environment or lint), 4 scope decisions, 3 held checks. **Impact:** the held checks and the streaming decision change the page's structure; nothing else in the plan is affected.

## Issues Encountered

- **The no-JavaScript conflict,** described in the checkpoint. This is a plan-level conflict, not a bug in the implementation; it was found by running the page with scripts off.
- **The 375px layout shift,** pre-existing from the phase 3 header: 0.139 on `/`, on `/styleguide` and on the tour page. Logged in `deferred-items.md`, not fixed, because the header is outside this plan.
- **A pre-existing failure in the browse list's canonical test,** `test/app/browse-list.spec.ts` "[R10] / has the approved title ... canonical". In this worktree the home page's canonical is `http://localhost:3100`, with no trailing slash, and the test expects `http://localhost:3100/`. The home page, the root layout and the config are unchanged since the base commit, so the failure predates this plan. It is not fixed here and needs a look from the owner of plan 04-05.
- **The worktree's Bash guard refused compound commands** that mixed `cd`, `||` and git in one line. Each was split into plain commands, and every git operation targeted the worktree.
- **Prettier rewrote files between edits,** and each file was re-read before the next edit.

## Verification Run

- `npx vitest run`: 84 files, 996 tests passed.
- `npx tsc --noEmit`: clean.
- `npm run lint`, `npm run lint:css`, `npm run check:conventions`, `npm run check:client`, `npm run format:check`, `npx knip`: clean.
- Playwright `app` project on the isolated server: 163 passed, 4 skipped (the held checks), 1 failed (the pre-existing canonical check above, on `/`, which this plan does not touch).
- Coverage of the new services: `bookings/service.ts` 100% lines; `reviews/service.ts` 95.8% lines (the plan's target is 85%).
- Layout shift at 1280px: under 0.1. At 375px: 0.139, from the header.

## Known Stubs

None. The skeletons are the intended placeholders for the streamed sections, and the skeleton-to-content swap is the design.

## Threat Flags

None beyond the plan's register. The `reviewPage` parameter is digits only and clamped (T-04-22). The reviews populate reads only name, photo and role (T-04-21). The booking read is uncached and takes its user id from the session only (T-04-20).

## Next Phase Readiness

- Not ready for phase 4's later plans until the streaming decision is made. Options B and C change this page's structure.
- Once decided, the continuation carries out the chosen option and the held checks, then writes the final SUMMARY.

## Self-Check: PASSED

Checked after writing this SUMMARY: all 16 files this plan created exist on disk (the list is in "Files Created/Modified"). The task commits `5eddc86`, `0cfce03` and `555ad5b` are ancestors of HEAD, and so are `7712016`, `e7df9cc` and `d4f58ea`. Before this SUMMARY, the verification run in "Verification Run" passed, with the one pre-existing exception recorded there.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16 (halted at a checkpoint)*
