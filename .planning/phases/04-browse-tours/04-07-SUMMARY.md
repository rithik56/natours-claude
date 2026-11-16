---
phase: 04-browse-tours
plan: 07
subsystem: ui
tags: [tour-page, booking-panel, reviews, guides, awaited-sections, no-javascript, cache, playwright, adr-0033, adr-0039]

# Dependency graph
requires:
  - phase: 04-06
    provides: the tour page and its aside slot, getBySlug, getGuides, TourDetail.guideIds
  - phase: 04-04
    provides: the cached catalogue, and the seeded database the Playwright project runs on
provides:
  - "BookingSection: the signed-in traveller's booking state, awaited on the tour page and never cached (R5)"
  - "findUpcomingPaid(userId, tourId, durationDays): the IST day of the earliest upcoming paid booking, or null (QA-06, QA-07, SEC-07)"
  - "bookingPanelProps: the four panel states chosen from the data alone (U11)"
  - "C1: the booking panel is a block in the page flow below 64em and sticky from 64em, with a matching skeleton for the styleguide"
  - "GuidesSection and ReviewsSection, awaited on the tour page with their headings in place, with the tour page working with JavaScript off (R4 as amended by ADR 0039, R11, D-08)"
  - "listForTour(tourId, page): the whole review list cached under ['reviews', tourId] and paged five at a time (D-08)"
  - "The reviewPage query parameter: digits only, at least 1, clamped to the last page (T-04-22)"
  - "ADR 0039 (the tour page awaits instead of streaming), ADR 0033, and the booking, guides and reviews contracts in docs/contracts.md section 11"
affects:
  - "04-08 and the rest of phase 4 build on this page. The page has no Suspense now; a streamed boundary there needs a new ADR, because it brings back the JavaScript-off gap"
  - "Phase 6: the write path that invalidates reviews:<tourId>, and the booking state that Checkout will read"

# Actuals (#2632): the estimate was 100000 tokens over 3 tasks.
# Same chars/4 scale as the estimate, measured over the 30 files changed since the base at HEAD 25ec7f2 (194484 characters).
actuals:
  tokens: 48621
  tasks: 3
  commits: 11
# Measured from the base the worktree was created on (git rev-list --count a9ea147..HEAD = 11, before this SUMMARY's commit).
plan_head_before: a9ea1478a8c3583bd8aaa7b175a01df2f675d75d
plan_head_after: 25ec7f25b14b759f7cb5dacef9bea3411ac39f1e

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The booking read is outside every cached function and takes its user id only from getCurrentUser() (R5)"
    - "Services import only their own model; the reviews service populates the author by name, so the users model is registered by the session graph (ARC-08)"
    - "The tour page awaits its sections with no Suspense: a section that is not in the first response is invisible with JavaScript off (ADR 0039)"
    - "Each section awaits only its own data. The three sections are sibling async Server Components, so their reads start together"
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
    - docs/adr/0039-tour-page-awaits-instead-of-streaming.md
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
    - src/server/modules/tours/dto.ts
    - test/app/booking-panel.spec.ts
    - test/app/tour-page.spec.ts
    - test/components/features/booking-section.test.ts
    - test/helpers/factories.ts
    - docs/adr/README.md
    - docs/adr/0032-no-loading-file-on-the-tour-page.md
    - docs/contracts.md
    - .planning/phases/04-browse-tours/deferred-items.md

key-decisions:
  - "findUpcomingPaid returns the IST day of the earliest upcoming paid booking, not the boolean plan.md 4.4 names, because the panel prints the date (ADR 0033)"
  - "Booked means an upcoming paid booking: refunded bookings never count, and a paid trip that has ended does not make the tour booked (QA-06, QA-07, SEC-07)"
  - "The panel's state order is no-dates, booked, logged-out, bookable, as the plan's contract lists them"
  - "Below 64em the booking panel is in the page flow, not pinned to the bottom of the screen (D-06, C1, ADR 0033)"
  - "The reviews are cached as one list under ['reviews', tourId]; the page number only slices it in memory (D-08, T-04-22)"
  - "A review whose author was deleted is skipped with a logged warning; a deactivated author's review stays (B12, RESEARCH A9)"
  - "The tour page awaits the booking panel, guides and reviews with no Suspense, so with JavaScript off they show their real content (R11, D-08). The user chose this option C on 16 Nov 2026; ADR 0039 records it and the rejected options A and B"
  - "The three reads start together as sibling async Server Components, not through an explicit Promise.all (R3 names Promise.all as the example; ADR 0039)"

patterns-established:
  - "Pattern: a held check is written as test.fixme with its reason in the file and in the contracts, so it is visible and cannot pass by accident"
  - "Pattern: a JavaScript-off check asserts real content on the server's first response, not a skeleton"

requirements-completed: [U11, R4, R3, B12]  # copied verbatim from the PLAN; R4 is complete for the tour page as amended by ADR 0039 (no Suspense there)

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
    rationale: "The look of the panel against the approved direction at 375px and 1280px, in light and dark themes, has not been checked by a person. Open human-verification item."
  - id: D5
    description: "The guides list shows the lead guide first as Lead guide and the others as Guide, under the page's Your guides heading, with JavaScript off"
    requirement: B12
    verification:
      - kind: unit
        ref: "test/components/features/guides-section.test.ts#[B12] the lead guide is labelled Lead guide"
        status: pass
      - kind: unit
        ref: "test/server/modules/tours/service.test.ts#[B12] puts the lead guide first, even when the tour lists him second"
        status: pass
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[B12] Your guides lists two guides, the lead guide first (JavaScript off)"
        status: pass
    human_judgment: true
    rationale: "The guides list's look against the mockups is for a person to check (open human item)."
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
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[D-08] Reviews lists the four reviews, with no Review pagination nav (JavaScript off)"
        status: pass
    human_judgment: true
    rationale: "No seeded tour has more than five reviews, so the browser never shows the nav with JavaScript off. Clicking a paging link without JavaScript is not proven in a browser; the nav markup is proven by the unit test. Open item."
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
    description: "ADR 0039 (the tour page awaits its sections), ADR 0033, and the booking, guides and reviews contracts in docs/contracts.md, with the plan.md 4 differences recorded"
    requirement: U11
    verification:
      - kind: other
        ref: "npm run format:check passes; docs/adr/README.md lists 0033 and 0039; docs/contracts.md has no streamed or Fallback wording for the tour page"
        status: pass
    human_judgment: true
    rationale: "The wording of the ADR and the contract is for a reader to check; no test reads it."
  - id: D10
    description: "With JavaScript off the tour page shows the booking panel's dates and Log in to book link, the guides and the reviews, because nothing on the page is streamed (R11, D-08, ADR 0039)"
    requirement: R11
    verification:
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[U11] the booking panel shows the dates, the price and a Log in to book link to this tour (JavaScript off)"
        status: pass
      - kind: e2e
        ref: "test/app/tour-page.spec.ts#[D-08] Reviews lists the four reviews, with no Review pagination nav (JavaScript off)"
        status: pass
    human_judgment: false

# Deliberate deviations and the TDD record are in the body below.
---

# Phase 4 Plan 07: Booking panel, guides and reviews Summary

**The tour page awaits its booking panel, guides and reviews instead of streaming them, so they show with JavaScript off; ADR 0039 records the decision the user approved on 16 Nov 2026 (option C).**

## Status: complete, with open human checks

All three tasks are complete. The decision from the earlier checkpoint is applied: option C, with no `Suspense` on the tour page. The three JavaScript-off checks that were held are plain tests and pass against real content. Still open: the human visual check at 375px and 1280px (light and dark, against the mockups), the 375px layout-shift check (held for the phase 3 header, see `deferred-items.md`), and the pre-existing `browse-list.spec.ts` canonical failure, which is outside this plan.

## Performance

- **Duration:** the first session ran about 25 min (approximate). The continuation ran in one session, roughly 19:00 to 19:15 IST (approximate).
- **Started:** 2026-11-16, about 18:38 IST (approximate, first session)
- **Completed:** 2026-11-16, 19:14 IST (the final gates passed before this SUMMARY was written)
- **Tasks:** 3 of 3 complete
- **Commits:** 11 since the base (`git rev-list --count a9ea147..HEAD`), before this SUMMARY's commit
- **Files:** 30 changed since the base

## Accomplishments

- **Task 1 (tracer), done.** `findUpcomingPaid` reads the signed-in traveller's upcoming paid bookings on every request, outside every cache. Refunded bookings and ended trips do not count. `bookingPanelProps` chooses the four states from the data. `BookingSection` has no local catch, so an outage reaches the error page. C1 is in: the panel is a bordered block in the page flow below 64em and sticky from 64em, and its skeleton has the same height at both widths.
- **Task 2 (TDD), done.** `listForTour` reads a tour's reviews once under `['reviews', tourId]`, newest first, with each author reduced to name, photo and role. It pages five at a time in memory and clamps `reviewPage`. A deleted author is skipped with a logged warning. `GuidesSection` shows the lead guide first.
- **Task 3, done.** The checkpoint's option C is applied:
  - The tour page has no `Suspense`. The booking panel, guides and reviews are awaited with the rest of the page, so their content is in the first response.
  - `GuidesFallback` and `ReviewsFallback` are removed, because nothing renders them now. The skeleton variants stay for `/styleguide` (U4).
  - ADR 0039 is written and indexed. ADR 0032 and ADR 0033 are amended where they described streaming. The contracts match the code.
  - The three JavaScript-off tests in `test/app/tour-page.spec.ts` are plain tests and pass. The 1280px layout-shift check passes.

## Checkpoint resolution

**Decision (user, 16 Nov 2026): option C.** The tour page awaits the booking panel, guides and reviews, with no `Suspense` boundary.

Applied as the resume instructions asked:

1. The three `<Suspense>` boundaries are removed from `src/app/tour/[slug]/page.tsx`. The booking read stays uncached (R5). The guides and reviews keep their cached paths (`tour:<id>`, `['reviews', tourId]`).
2. `GuidesFallback` and `ReviewsFallback` are removed as dead code, and the page's `Skeleton` import with them. Knip is clean. The skeleton variants and `Skeleton` itself stay, because the styleguide and U4 require them.
3. ADR 0039 is written as the next free number after the reserved 0034 to 0038. It records the context (the R4 against R11 and D-08 conflict, the measured JavaScript-off behaviour), the decision, the rejected options A and B, and the consequences.
4. The three JavaScript-off tests are un-held and pass. The test that asserted streaming on this page is updated. The 375px check stays held.
5. Held and left alone, as the continuation asked: the 375px layout-shift check (the phase 3 header, `deferred-items.md`), and the pre-existing `browse-list.spec.ts` R10 canonical failure (`deferred-items.md`). The human visual check stays an open item.

## Held checks

- **The 375px layout-shift test, `test.fixme`:** 0.139 on every route, including `/styleguide` where nothing streams. The cause is the site header's height changing when its mobile menu hydrates (recorded in `deferred-items.md`). Phase 3's shell, not this plan.
- **Human check (open):** the tour page at 375px and 1280px, light and dark, against the approved mockups, has not been reviewed by a person. Not performed.
- **Pre-existing failure, not this plan:** `test/app/browse-list.spec.ts` "[R10] / has the approved title ... canonical". The canonical is `http://localhost:3100` with no trailing slash, and the test expects a trailing slash. Logged in `deferred-items.md`.

## Task Commits

1. **Task 1 (tracer): booking panel streams the signed-in traveller's own state** - `5eddc86` (feat)
2. **Task 2 (RED): failing tests for review paging, the reviews list and guide labels** - `7712016` (test)
3. **Task 2 (GREEN): guides and paginated reviews stream behind same-sized skeletons** - `0cfce03` (feat)
4. **Task 3: the streamed tour page's layout shift at 1280px, its Reviews text and the clamped reviewPage** - `e7df9cc` (test)
5. **Refactor: keep the reviews page size module-private, as knip requires** - `d4f58ea` (refactor)
6. **Task 3 docs: ADR 0033 and the booking, guides and reviews contracts** - `555ad5b` (docs)
7. **Halt record: plan 04-07 recorded as halted at the streaming decision** - `bf0ff28` (docs)
8. **Continuation: the tour page awaits its sections, with no Suspense (option C)** - `f94d1c4` (refactor)
9. **Continuation: the JavaScript-off checks are plain tests** - `bb79f56` (test)
10. **Continuation: ADR 0039, the ADR index, ADRs 0032 and 0033, and the contracts** - `3b4680a` (docs)
11. **Continuation: comment-only corrections** - `25ec7f2` (docs)

**Plan metadata:** this SUMMARY, committed after the task commits. STATE.md, ROADMAP.md and REQUIREMENTS.md are left to the orchestrator.

## TDD record

- **Task 2 RED:** commit `7712016`. The three new test files (`reviews/service`, `reviews-section`, `guides-section`) were run before any implementation existed. They failed at module load (`Cannot find package '@/server/modules/reviews/service'`, and the same for the two components), not on an assertion. tdd.md's classifier treats a load failure as INVALID_RED, so this RED is weaker than the reference asks for. It is disclosed here rather than hidden. The classifier (`gsd_run check tdd-red-evidence`) was not run, because `workflow.tdd_mode` is `false` in `.planning/config.json`.
- **Task 2 GREEN:** commit `0cfce03`. All 15 tests passed on the first run.

## Files Created/Modified

- `src/server/modules/bookings/service.ts` - `findUpcomingPaid`; uncached; the user id comes from the session only
- `src/components/features/booking-state.ts` - `bookingPanelProps`, a pure state chooser
- `src/components/features/booking-section.tsx` - the booking panel, awaited on the tour page, with no try/catch
- `src/server/modules/reviews/service.ts` - `listForTour`, cached once under `['reviews', tourId]`, tagged `reviews:<tourId>`, paged five at a time
- `src/server/modules/reviews/schemas.ts` - `reviewPageQuerySchema`. Added by the first executor; not in the plan's file list
- `src/components/features/guides-section.tsx`, `guides-section.module.css` - `GuidesSection` and `guideRoleLabel`. The CSS module was added by the first executor; not in the plan's file list. `GuidesFallback` removed in the continuation
- `src/components/features/reviews-section.tsx`, `reviews-section.module.css` - `ReviewList` and `ReviewsSection`. `ReviewsFallback` removed in the continuation
- `src/app/tour/[slug]/page.tsx` - the three sections awaited with no `Suspense`; the `reviewPage` read; the `#reviews` anchor. `page.module.css` - the `#reviews` anchor offset and the aside column
- `src/components/ui/booking-panel.module.css`, `skeleton.module.css` - C1: the panel in the page flow below 64em, sticky from 64em; the booking skeleton copies its box (for the styleguide)
- `src/server/modules/tours/dto.ts`, `test/components/features/booking-section.test.ts`, `src/components/features/reviews-section.module.css` - comment-only corrections in the continuation
- `docs/adr/0033-booking-panel-in-the-page-flow.md` - the D-06 deviation and the booked contract; the streaming consequence amended by ADR 0039
- `docs/adr/0039-tour-page-awaits-instead-of-streaming.md` - the checkpoint's decision (option C), with the rejected options and the consequences
- `docs/adr/0032-no-loading-file-on-the-tour-page.md` - decision 2 and the consequences amended for the tour page (ADR 0039)
- `docs/adr/README.md` - rows for 0033 and 0039; the note on the reserved 0034 to 0038
- `docs/contracts.md` - the no-Suspense row, the section 11 contract without the removed fallbacks, and the resolved open item
- `.planning/phases/04-browse-tours/deferred-items.md` - the header shift (375px) and the browse-list canonical failure
- Tests: `test/server/modules/bookings/service.test.ts`, `test/server/modules/reviews/service.test.ts`, `test/components/features/booking-state.test.ts`, `booking-section.test.ts`, `reviews-section.test.ts`, `guides-section.test.ts`; `test/app/booking-panel.spec.ts`, `test/app/tour-page.spec.ts`; `test/helpers/factories.ts` (`createReview` takes `createdAt`)

## Decisions Made

- `findUpcomingPaid` returns the IST day, not a boolean, because the panel prints the date. Recorded in ADR 0033 and the contracts.
- "Booked" means an upcoming paid booking. A refunded booking and a trip that has ended do not count.
- The panel's state order is no-dates, booked, logged-out, bookable, as the plan lists them. A traveller whose only upcoming start date is on today or before it therefore sees "No upcoming start dates" even with a booking.
- The tour page awaits the three sections with no `Suspense`, so with JavaScript off they show their real content (R11, D-08). Option C, chosen by the user on 16 Nov 2026. ADR 0039.
- The reviews service does not import the users model, to keep ARC-08. The populate on `user` relies on the users model being registered by the session graph, which the tour page always loads. A test of the reviews service imports the factories, which do register it.
- A review whose author was deleted is skipped with a logged warning. A deactivated author's review stays.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dependencies were not installed in the worktree** (first session)
- **Issue:** `node_modules` was missing.
- **Fix:** `npm ci` against the committed lockfile (ADR 0004). No package was added or changed.
- **Committed in:** not committed (environment only)

**2. [Rule 3 - Blocking] `next-env.d.ts` was missing, so typecheck reported `PageProps` and image-module errors** (first session)
- **Fix:** `npx next typegen`. The file is gitignored.
- **Committed in:** not committed (environment only)

**3. [Rule 3 - Blocking] Port 3000 is served by another session's dev server, so the browser run used an isolated server** (first session, and the continuation)
- **Issue:** `playwright.config.ts` reuses an existing server on port 3000. That server belongs to the main checkout, not this worktree. Reusing it would test the wrong code.
- **Fix:** the port-3000 process was not touched. The browser runs use a scratch Playwright config outside the repository, with the app on port 3100 and its own database `natours-wt-ac4d83b375`. The clock is pinned to 2026-11-08 as the repo config does.
- **Committed in:** not committed (scratch config lives in the session scratchpad)

**4. [Rule 3 - Blocking] knip flagged `REVIEWS_PER_PAGE` as an unused export** (first session)
- **Fix:** made it module-private. Commit `d4f58ea`.

**5. [Rule 3 - Blocking] The first browser run of the continuation failed on a cold dev server, so the browser checks were rerun on a warmed server**
- **Found during:** the first run of the tour-page spec in the continuation.
- **Issue:** three checks failed during navigations while the routes compiled for the first time. The 404 heading was not found, the phone-order headings were read as the execution context was destroyed, and the 1280px layout check timed out in `networkidle`. The page's own output is consistent with cold-compile reloads. I did not isolate the cause further.
- **Fix:** I started the isolated dev server myself (`npx next dev -p 3100` from the worktree, with the same environment), warmed five routes with `curl`, and set `reuseExistingServer: true` in the scratch config. The same code then passed, in the tour-page spec (13 passed, 1 held) and in the full app project. No code changed for this.
- **Committed in:** not committed (environment only)

### Scope and design decisions (not auto-fixes)

- **Sibling async components, not an explicit `Promise.all`.** R3 names `Promise.all` as the example for parallel loads. The page keeps the three section components as async Server Components with no `await` between them, so their reads start together. This is the form Next's documentation describes for independent reads in sibling components. It keeps each section's contract and its tests. ADR 0039 records it.
- **`GuidesFallback` and `ReviewsFallback` are removed.** They were exported from their components, and nothing renders them after the boundaries went. Knip would flag them as unused exports. The skeleton variants stay for the styleguide and U4.
- **ADR numbering.** ADR 0039 is numbered as requested. The numbers 0034 to 0038 are reserved for later phase 4 plans. The ADR README said "no gaps", so it now says the reserved numbers are the one allowed gap.
- **ADR 0032 and ADR 0033 amended.** Both described the tour page's sections as streamed. Their status line and streaming wording now point to ADR 0039. Their other decisions stand.
- **Comment-only corrections** in `src/server/modules/tours/dto.ts`, `test/components/features/booking-section.test.ts` and `src/components/features/reviews-section.module.css`. No behaviour changed.
- **`src/components/features/booking-section.tsx`, `guides-section.tsx` and `reviews-section.tsx` keep their contracts.** Only the doc comments changed in the continuation.
- **Not changed: `.planning/phases/04-browse-tours/04-UI-SPEC.md`.** It still describes the booking panel, guides and reviews as streaming (its "What streams" paragraph and the component table rows). It is a planning document the orchestrator owns, so it is flagged here for an update rather than edited.
- **Not changed: `src/components/ui/skeleton.tsx` and the styleguide's copy** ("A still placeholder for each streamed section"). It describes the U4 component, which is still a placeholder for a streamed section wherever one exists.
- **`generateMetadata` takes `params` only.** It does not read `searchParams`, so its existing metadata test still holds.
- **The styleguide skeleton check compares heights, not widths.** The styleguide lays each state out as a flex row, so each box is sized to its content: the panel is 9.8px wider than its skeleton there, at both widths, with the same height. On the tour page both are the column width. The spec comment says so.
- **The paging proof with four plus two reviews is at the service level** (`test/server/modules/reviews/service.test.ts`), not in the browser. The browser has no write path for reviews before Phase 6, and a direct database write would sit behind the real cache.

### Held and not done

- The 375px layout-shift test is `test.fixme`. See "Held checks".
- The human visual check (Task 3) was not performed.

**Total deviations:** 5 auto-fixed (all Rule 3, environment or lint), 8 scope decisions. **Impact:** the page structure changed as ADR 0039 records; nothing else in the plan is affected.

## Issues Encountered

- **The no-JavaScript conflict,** resolved by option C (ADR 0039). It was a plan-level conflict, found by running the page with scripts off, not a bug in the implementation.
- **The 375px layout shift,** pre-existing from the phase 3 header: 0.139 on `/`, on `/styleguide` and on the tour page. Logged in `deferred-items.md`, not fixed, because the header is outside this plan.
- **The pre-existing browse-list canonical failure** (`test/app/browse-list.spec.ts`, "[R10] / has the approved title ... canonical"). It predates this plan and is logged in `deferred-items.md` for the owner of plan 04-05.
- **Gap: paging with JavaScript off is not proven in a browser.** The seed has four reviews per tour, so the "Review pagination" nav never renders in the browser. The nav markup is proven by `test/components/features/reviews-section.test.ts`, and the clamped `reviewPage` is proven in the browser. A no-JavaScript click on a paging link is not tested.
- **Not measured: the time-to-first-byte effect of awaiting the sections** (ADR 0039, consequences). The reads are cached or local, but no timing was taken.

## Verification Run

Final gates, run on the code state at `25ec7f2` after the last comment-only commit:

- `npx vitest run`: 84 files, 996 tests passed (the same count before and after the comment-only commits).
- `npx tsc --noEmit`: exit 0.
- `npm run lint` (eslint with `--max-warnings=0`): exit 0.
- `npm run lint:css`: exit 0.
- `npm run check:conventions`: exit 0. `npm run check:client`: exit 0.
- `npm run format:check`: exit 0 (all files).
- `npx knip`: exit 0, clean.
- Playwright `tour-page` spec, isolated server on port 3100 with its own database: 13 passed, 1 skipped (the held 375px check).
- Playwright `app` project, the same server, full run: 166 passed, 1 skipped (the held 375px check), 1 failed (the pre-existing browse-list R10 canonical check, which expects `http://localhost:3100/` and receives `http://localhost:3100`). Before this continuation the same project showed 163 passed, 4 skipped, 1 failed.
- The three JavaScript-off checks pass against real content: the booking panel's dates and "Log in to book" link to `/login?next=%2Ftour%2Fladakh-high-passes`; the guides with "Lead guide" first; the four reviews with no pagination nav.
- Layout shift at 1280px: under 0.1 (passing). At 375px: 0.139, from the header (held).
- Raw HTML from the server contains the booking, guide and review content with no streaming containers.
- The run regenerated `docs/design/screens/styleguide-*.png`. They were restored with `git checkout`, and none is in any commit.
- Coverage of the new services was not re-measured in this continuation. The first session measured `bookings/service.ts` at 100% lines and `reviews/service.ts` at 95.8% lines.

## Known Stubs

None. The skeleton variants are no longer placeholders on the tour page. They are shown on `/styleguide` only (U4), and the tour page shows real content.

## Threat Flags

None beyond the plan's register. The `reviewPage` parameter is digits only and clamped (T-04-22). The reviews populate reads only name, photo and role (T-04-21). The booking read is uncached and takes its user id from the session only (T-04-20). Awaiting the three sections puts no new data on the page: the booking panel was already in the page's first response with JavaScript on.

## Next Phase Readiness

- The streaming decision is made (ADR 0039, option C). The tour page has no `Suspense`. A later plan that wants a streamed boundary on this page needs a new ADR, because it brings back the JavaScript-off gap.
- Ready for 04-08 and the rest of phase 4 on this page's sections, as far as this plan is concerned. The orchestrator decides when to dispatch them.
- Open for the orchestrator: the human visual check at 375px and 1280px, light and dark; the 375px header shift; the pre-existing browse-list canonical failure; `04-UI-SPEC.md` still describes the sections as streaming, and wants an update to match ADR 0039.

## Self-Check: PASSED

Checked after the final gates, before this SUMMARY was committed: every file this plan created exists on disk, including `docs/adr/0039-tour-page-awaits-instead-of-streaming.md`. The commits `f94d1c4`, `bb79f56`, `3b4680a` and `25ec7f2` are ancestors of HEAD, and so are the first session's `5eddc86`, `7712016`, `0cfce03`, `e7df9cc`, `d4f58ea`, `555ad5b` and the halt record `bf0ff28`. The tour page contains no `<Suspense>` element; the one "Suspense" in the file is a comment.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16 (complete; human visual check open)*
