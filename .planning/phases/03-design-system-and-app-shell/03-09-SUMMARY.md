---
phase: 03-design-system-and-app-shell
plan: 09
subsystem: ui
tags: [server-components, review, guide, empty-state, skeleton, cls, playwright, vitest, css-layers]

requires:
  - phase: 03-design-system-and-app-shell
    provides: tokens, five-layer CSS, Button, gated /styleguide (plan 03-01); ui/text-field field-error contract (03-04); ui/star-rating-input (03-05); ui/avatar, ui/star-rating (03-05/03-06); ui/link (03-04); ui/confirm-dialog and ui/booking-panel (03-08)
provides:
  - ui/review-item, ui/review-form, ui/guide-item, ui/empty-state, ui/skeleton (the last five components of the U4 minimum set)
  - Skeleton variants measured against the real review item, guide item and booking panel (R4)
  - Styleguide sections for all five
affects: [03-10 styleguide assembly, Phase 4 tour page and overview (Suspense fallbacks, empty states), Phase 5 My tours empty groups, Phase 6 review actions]

actuals:
  tokens: 13800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A skeleton variant copies the real component's box line for line (font size times --line-height-body), and a Playwright spec measures both on /styleguide"
    - "A Server Component with a function prop is rendered from a client styleguide section, with a // client: reason line"
    - "useId in a Server Component gives each form instance its own field ids, so two forms on one page never share a label target"
    - "Unit tests render Server Components with renderToStaticMarkup; one render tree per test when ids matter, because each render restarts the useId counter"

key-files:
  created:
    - src/components/ui/review-item.tsx
    - src/components/ui/review-item.module.css
    - src/components/ui/guide-item.tsx
    - src/components/ui/guide-item.module.css
    - src/components/ui/review-form.tsx
    - src/components/ui/review-form.module.css
    - src/components/ui/empty-state.tsx
    - src/components/ui/empty-state.module.css
    - src/components/ui/skeleton.tsx
    - src/components/ui/skeleton.module.css
    - src/app/styleguide/sections/review-item-section.tsx
    - src/app/styleguide/sections/guide-item-section.tsx
    - src/app/styleguide/sections/review-form-section.tsx
    - src/app/styleguide/sections/empty-state-section.tsx
    - src/app/styleguide/sections/skeleton-section.tsx
    - test/components/ui/review-item.test.ts
    - test/components/ui/guide-item.test.ts
    - test/components/ui/review-form.test.ts
    - test/components/ui/empty-state.test.ts
    - test/app/review-guide-items.spec.ts
    - test/app/review-form.spec.ts
    - test/app/empty-state-skeleton.spec.ts
  modified:
    - src/components/ui/booking-panel.tsx
    - src/components/ui/booking-panel.module.css
    - src/app/styleguide/page.tsx
    - test/app/booking-panel.spec.ts
    - test/app/star-rating-input.spec.ts

key-decisions:
  - "Skeleton is a still fill with no animation: U25 allows one self-playing motion on the site (the route line), so the plan's shimmer or pulse was not built"
  - "A skeleton variant is the same box as its real component: guide item and booking panel match to the pixel at 375 and 1280px; the review item matches a review of the median seed length (about 185 characters), 5 comment lines at 375px and 2 at 64em and up"
  - "ReviewItem takes editHref (a link) instead of onEdit, and onDelete runs from ConfirmDialog's confirm button; canEdit is a discriminated union, so edit and delete always come as a set"
  - "EmptyState renders the action as an inline link after the fact, as the approved overview mockup does, not as a button; a blank message or action throws a RangeError, so no empty state can lack its action"
  - "ReviewForm accepts an optional commentError, so the textarea has the same error contract as ui/text-field, and uses useId for its field ids"
  - "BookingPanel's no-dates state now renders EmptyState with a See other tours link to /; the link is not a button, so direction.md's no date select or button still holds"
  - "Confirm copy for deleting a review is new: Delete your review? / Delete my review. It needs the design gate's review, as the deactivate copy does"

requirements-completed: []
requirements-partial: [U4]

coverage:
  - id: D1
    description: "ReviewItem shows the rating through StarRating, the author through Avatar, the date through formatDate in India Standard Time and the comment; edit and delete show only when canEdit is true, and delete asks through ConfirmDialog with Cancel focused"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/review-item.test.ts"
        status: pass
      - kind: e2e
        ref: "test/app/review-guide-items.spec.ts#[U4] the reviewer sees Edit review, and deleting asks first with Cancel focused"
        status: pass
    human_judgment: false
  - id: D2
    description: "GuideItem shows a guide's photo or initials, name and role, with no rating, link or button"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/guide-item.test.ts"
        status: pass
      - kind: e2e
        ref: "test/app/review-guide-items.spec.ts#[U4] a guide shows initials, name and role, with nothing to click"
        status: pass
    human_judgment: false
  - id: D3
    description: "ReviewForm renders null unless canReview is true, composes the one StarRatingInput, and gives its comment field a label, a 1,000 character limit and a linked error"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/review-form.test.ts"
        status: pass
      - kind: e2e
        ref: "test/app/review-form.spec.ts#[U16] a comment error is linked to its textarea"
        status: pass
      - kind: e2e
        ref: "test/app/review-form.spec.ts#[U14] the star input in the form is keyboard operable"
        status: pass
    human_judgment: false
  - id: D4
    description: "EmptyState states the fact then links to one action, adds no copy of its own, and refuses a blank message or action; the booking panel's no-dates state uses it"
    requirement: "U4"
    verification:
      - kind: unit
        ref: "test/components/ui/empty-state.test.ts"
        status: pass
      - kind: e2e
        ref: "test/app/empty-state-skeleton.spec.ts#[U4] every empty state states the fact and then links to one action"
        status: pass
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[U4] state 4: no future dates shows the empty state, with a link to other tours and no date or button"
        status: pass
    human_judgment: false
  - id: D5
    description: "Skeleton variants are the size of the real review item, guide item and booking panel at 375 and 1280px, and play no animation"
    requirement: "R4"
    verification:
      - kind: e2e
        ref: "test/app/empty-state-skeleton.spec.ts#[R4] the review item skeleton is the height of a review of the median seed length, and no taller than the longest"
        status: pass
      - kind: e2e
        ref: "test/app/empty-state-skeleton.spec.ts#[R4] the guide item skeleton is exactly the height of a guide item"
        status: pass
      - kind: e2e
        ref: "test/app/empty-state-skeleton.spec.ts#[R4] the booking panel skeleton is exactly the height of the bookable booking panel"
        status: pass
      - kind: e2e
        ref: "test/app/empty-state-skeleton.spec.ts#[R4] a skeleton is hidden from assistive technology and plays no animation"
        status: pass
    human_judgment: true
    rationale: "A review's height depends on its text, so the skeleton matches the median seed review, not every review. Whether the placeholder reads well is a judgement for the design gate. CLS itself is measured by Lighthouse CI once Phase 4 streams real sections."

duration: about 45min (approximate)
completed: 2026-11-15
status: complete
commits: 3
plan_head_before: bbe62586a16d8d8ca4f21b5469aa85fb2f29fa30
plan_head_after: 1e9c10b87b76aa0047902c478e911088016e73ae
---

# Phase 3 Plan 09: Review, guide, empty state and skeleton Summary

**The last five `ui/` components: review item and form composing avatar, star rating, star input and confirm dialog; a guide item; an empty state that always names its action; and a still skeleton whose variants are measured against the real review, guide and booking panel boxes.**

## Performance

- **Duration:** about 45 min (approximate)
- **Completed:** 2026-11-15
- **Tasks:** 3
- **Files modified:** 27 (22 created, 5 modified)

## Accomplishments

- `ui/review-item` composes `Avatar`, `StarRating`, `formatDate` and `ConfirmDialog`. The date is in India Standard Time (a review at 19:30 UTC on 30 July shows 31 Jul). Edit and delete show only when `canEdit` is true.
- `ui/guide-item` composes `Avatar` and shows name and role as plain text.
- `ui/review-form` renders `null` unless `canReview` is true. Otherwise it renders one `StarRatingInput`, a labelled comment textarea (required, 1,000 characters, linked error) and a Post review submit button.
- `ui/empty-state` renders the fact and then one link. A blank message or action throws. `ui/booking-panel` now uses it for the no-dates state, replacing the inline markup from 03-08.
- `ui/skeleton` has a plain text variant (width and height settable) and three named variants. Measured on `/styleguide`: guide item 56px against 56px, booking panel 216.8px against 216.8px at 375px and 233.8px against 233.8px at 1280px, review item 249.4px at 375px and 175.0px at 1280px against the median-length seed review at the same heights.
- Styleguide sections for all five, using the real Ladakh High Passes reviews, guides and copy.md wording.
- Verification: Vitest 57 files, 736 tests pass. The full app Playwright project passes 115 of 115. `tsc`, `npm run lint`, `lint:css`, `check:client` (10 client files), `check:conventions` and `prettier --check` are clean.

## Task Commits

1. **Task 1: review item and guide item** - `f28506d` (feat)
2. **Task 2: review form** - `cc0b6d1` (feat). Also scopes the star rating spec to its own section.
3. **Task 3: empty state, skeleton and the booking panel's empty state** - `1e9c10b` (feat)

**Plan metadata:** recorded in the docs commit that adds this file.

## Files Created/Modified

- `src/components/ui/review-item.tsx`, `guide-item.tsx`, `review-form.tsx`, `empty-state.tsx`, `skeleton.tsx` and their `.module.css` files
- `src/components/ui/booking-panel.tsx`, `.module.css` - no-dates state renders `EmptyState`; the unused `.empty` rule is removed
- `src/app/styleguide/sections/{review-item,guide-item,review-form,empty-state,skeleton}-section.tsx` and `page.tsx` (imports and renders only)
- `test/components/ui/{review-item,guide-item,review-form,empty-state}.test.ts` - Vitest, `renderToStaticMarkup`
- `test/app/review-guide-items.spec.ts`, `review-form.spec.ts`, `empty-state-skeleton.spec.ts` - Playwright at 375 and 1280px
- `test/app/booking-panel.spec.ts`, `star-rating-input.spec.ts` - existing specs adjusted (see Deviations)

## Decisions Made

- **No skeleton animation.** See Deviations 1.
- **Skeleton sizes are structural, not magic numbers.** Every line is `font size * --line-height-body`, the same as the real text, with a bar one `--space-1` short at the top and bottom so a stack of lines reads as text but keeps the height. The review skeleton keeps five comment lines in the markup and hides lines 3 to 5 from 64em, because the real comment is capped at 45rem and median-length text fits two lines there.
- **Skeletons are `aria-hidden`.** The streamed section's own heading and `aria-busy` state, set by the Phase 4 caller, speak for it.
- **ReviewItem and GuideItem render `<li>`**, as the mockup does, so the caller supplies the list. The avatar is wrapped in `aria-hidden` because the name is printed beside it, so the person is not announced twice.
- **ReviewForm field ids come from `useId`**, so two forms on one page (the styleguide shows two) never share a label target.
- **Delete review copy** ("Delete your review?", "Your rating and comment will be removed from this tour. This cannot be undone.", "Delete my review") and the **Post review** and **See other tours** labels are new. They should be reviewed at the design gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Spec conflict] Skeleton has no shimmer or pulse**
- **Found during:** Task 3
- **Issue:** the plan asks for "a subtle shimmer/pulse animation respecting `prefers-reduced-motion`". plan.md U25 and `docs/design/direction.md` allow exactly one self-playing motion (the route line) and cap all other motion at 200ms, triggered by a user action. A looping skeleton animation breaks that.
- **Fix:** the skeleton is a still fill. The base.css reduced-motion rule is therefore not needed here and was not touched. A Playwright spec asserts every skeleton node has `animation-name: none`, with and without reduced motion.
- **Files modified:** `src/components/ui/skeleton.module.css`, `test/app/empty-state-skeleton.spec.ts`
- **Committed in:** `1e9c10b`

**2. [Rule 3 - Interface] ReviewItem props differ from the plan's list**
- **Found during:** Task 1
- **Issue:** the plan lists `onEdit` and `onDelete` callbacks on a Server Component. A Server Component cannot attach a click handler, and `ConfirmDialog` (a Client Component) only accepts `onConfirm` as a callback.
- **Fix:** `canEdit` is a discriminated union: `{ canEdit: true; editHref: string; onDelete: () => void }` or no edit controls. Edit is a link to `editHref`. `onDelete` is passed to `ConfirmDialog`'s `onConfirm`, so in Phase 6 it can be a Server Action. Because the styleguide passes a plain function, `review-item-section.tsx` is a client file with a `// client:` reason.
- **Files modified:** `src/components/ui/review-item.tsx`, `src/app/styleguide/sections/review-item-section.tsx`
- **Committed in:** `f28506d`

**3. [Rule 3 - Interface] EmptyState action is an inline link, not button-styled**
- **Found during:** Task 3
- **Issue:** the plan says `ui/link.tsx` "styled as a button". The approved overview mockup renders the action as an inline link after the fact, and direction.md says the booking panel's empty state has no button.
- **Fix:** `<p>{message} <Link>{label}</Link></p>`, following the mockup. `Link` is used unchanged.
- **Committed in:** `1e9c10b`

**4. [Rule 2 - Missing functionality] Review form gets a comment error prop, a length limit and unique ids**
- **Found during:** Task 2
- **Issue:** the plan says the textarea has "the same label/error contract ui/text-field uses" but lists no prop to carry the error. plan.md §4.1 limits a review to 1 to 1,000 characters. A fixed `id="comment"` would collide when two forms are on one page.
- **Fix:** optional `commentError`, wired through `fieldErrorProps`; `required` and `maxLength={1000}`; the field id comes from `useId`.
- **Committed in:** `cc0b6d1`

**5. [Rule 3 - Blocking] Booking panel's no-dates state gains an action**
- **Found during:** Task 3
- **Issue:** the orchestrator asked to replace 03-08's inline empty markup with `ui/empty-state`, which always needs an action. The 03-08 spec asserted only the message.
- **Fix:** the state renders `EmptyState` with "See other tours" linking to `/`. The spec now asserts that link and still asserts no combobox and no button.
- **Files modified:** `src/components/ui/booking-panel.tsx`, `booking-panel.module.css`, `test/app/booking-panel.spec.ts`
- **Committed in:** `1e9c10b`

**6. [Rule 1 - Bug] Existing star rating spec matched every star input on the page**
- **Found during:** Task 2
- **Issue:** the review form section adds two more star inputs, so `test/app/star-rating-input.spec.ts` (03-05) would hit strict-mode violations.
- **Fix:** its locators are scoped to the "Star rating" region. Assertions are unchanged.
- **Committed in:** `cc0b6d1`

**7. [Rule 2 - Missing verification] Unit and Playwright specs added**
- **Found during:** all tasks
- **Issue:** the plan's `<verify>` lines are `tsc`, `stylelint` and `eslint`, which assert none of the must_haves (composition, the `canReview` gate, fact-then-action, no layout shift).
- **Fix:** four Vitest files and three Playwright specs, none in the plan's `files_modified`.
- **Committed in:** `f28506d`, `cc0b6d1`, `1e9c10b`

**8. [Rule 3 - Blocking] Styleguide page imports the new sections**
- **Found during:** Task 1
- **Issue:** `knip` fails on section files nothing imports, and `page.tsx` is not in `files_modified`. Same situation as plans 03-02 and 03-08.
- **Fix:** `page.tsx` imports and renders the five sections; every existing import and render is kept.
- **Committed in:** `f28506d`, `cc0b6d1`, `1e9c10b`

---

**Total deviations:** 8 (1 spec conflict, 2 interface, 1 blocking, 1 bug, 2 missing functionality or verification, 1 blocking build)
**Impact on plan:** the skeleton's lack of animation follows plan.md over the plan. Everything else keeps the plan's intent and its five components.

## Issues Encountered

- **node_modules and next-env.d.ts were missing in this worktree.** `npm ci` and `npx next typegen` fixed both. Without `next-env.d.ts`, `tsc` fails on the `.jpg` imports in 03-07's tour row section. Neither is a code change.
- **A hand-written `.check()` on a star radio timed out**, because the native radio is visually hidden. The spec clicks its label, as a traveller does.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-10 can assemble the styleguide. It should reconcile the booking panel's inline date select and price with `ui/start-date-select` and `ui/price`; the empty state is already reconciled.
- Phase 4 uses the skeleton variants as `<Suspense>` fallbacks. It must put them where the real list renders, and mark the section `aria-busy`. Measure CLS in Lighthouse CI once real sections stream.
- Phase 6 wires `ReviewForm`'s `action` and `onDelete` to Server Actions. T-03-13 stays open for its planner: confirm the server re-checks the booking and the author (S5).
- **knip reports 10 unused files** from plan 03-07 (`facts-strip`, `itinerary`, `pagination`, `photo-credits`, `tour-row` and their styleguide sections). They are not rendered by `page.tsx`. This is not from this plan and was not fixed here; plan 03-10's assembly is the natural place.

## Known Stubs

- `src/app/styleguide/sections/review-item-section.tsx`: the Edit review link goes to `/tour/ladakh-high-passes`, and the delete action only sets a status line. Phase 6 connects the real edit page and `deleteReviewAction`.
- `src/app/styleguide/sections/review-form-section.tsx`: submitting reports what would be sent and saves nothing. `ReviewForm` has no `action` here. Phase 6 adds the Server Action and `useActionState`.
- `src/components/ui/empty-state.tsx` callers: the See all tours, Clear filters and See other tours links go to `/`. The overview's filter reset and the My tours page arrive in Phases 4 and 5.

## Threat Flags

None. T-03-13 (client-only authorization) is accepted as planned: the comment in `review-form.tsx` states that `canReview` is a safety net and not the authorization boundary, and Phase 6 must re-check on the server (S5). T-03-SC is accepted: no package was installed.

## Self-Check

- [x] Created files exist: the five components and their CSS, the five sections, four Vitest files and three Playwright specs
- [x] Commits `f28506d`, `cc0b6d1` and `1e9c10b` are ancestors of HEAD
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run lint:css`, `npm run check:client` (10 client files), `npm run check:conventions` and `prettier --check` pass
- [x] `npx vitest run`: 57 files, 736 tests pass
- [x] `npx playwright test --project=app`: 115 of 115 pass
- [x] `npm run knip` reports only the 10 unused files from plan 03-07 listed above
- [x] No edits to `.planning/STATE.md` or `.planning/ROADMAP.md`

## Self-Check: PASSED
