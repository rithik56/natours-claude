---
phase: 03-design-system-and-app-shell
plan: 08
subsystem: ui
tags: [server-components, native-dialog, showModal, svg, css-animation, prefers-reduced-motion, playwright, css-layers]

requires:
  - phase: 03-design-system-and-app-shell
    provides: five-layer CSS, tokens.css (--duration-signature, --shadow-overlay, --color-error), Button, the gated /styleguide (plan 03-01)
provides:
  - ui/map-frame, the static route frame with the one self-playing motion (U25)
  - ui/booking-panel, four states driven by one discriminated status prop
  - ui/confirm-dialog, a native <dialog> with Cancel as the safe default
  - Styleguide sections for all three, and Playwright specs for each
affects: [03-10 styleguide assembly (reconcile the inline date select, price and empty state), Phase 4 RouteMap and tour page, Phase 4/6 account deactivation]

actuals:
  tokens: 7778
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "SVG draw-on animation with pathLength=1, so the dash length needs no measuring"
    - "Native <dialog> + showModal(): no focus-trap, Escape or inert code in the component"
    - "Cancel first in the form: first focusable control, default button, and the one that takes focus on open"
    - "Client component that passes a callback: the styleguide section itself is a client file, with a // client: reason line"

key-files:
  created:
    - src/components/ui/map-frame.tsx
    - src/components/ui/map-frame.module.css
    - src/components/ui/booking-panel.tsx
    - src/components/ui/booking-panel.module.css
    - src/components/ui/confirm-dialog.tsx
    - src/components/ui/confirm-dialog.module.css
    - src/app/styleguide/sections/map-frame-section.tsx
    - src/app/styleguide/sections/booking-panel-section.tsx
    - src/app/styleguide/sections/confirm-dialog-section.tsx
    - test/app/map-frame.spec.ts
    - test/app/booking-panel.spec.ts
    - test/app/confirm-dialog.spec.ts
  modified:
    - src/app/styleguide/page.tsx
    - test/app/styleguide.spec.ts

key-decisions:
  - "Route line draws with stroke-dasharray 1 1 on paths with pathLength=1, so the animation length is independent of the real route length; the outline and the yellow line draw together"
  - "Under prefers-reduced-motion the animation is removed outright (animation: none, dasharray none, offset 0), not shortened"
  - "Stops are projected with a cos(mean latitude) longitude scale and one scale factor on both axes, north up; a stop that lands on an earlier one (Day 8 at Leh) is nudged along the diagonal so both stay visible"
  - "The milestone marker is a rounded Highway yellow stone with Neel text, which keeps the rule that yellow only ever carries Neel text"
  - "Booking panel is a pure display component chosen by status; its mobile form is a sticky bottom bar and its desktop form is sticky at the top of the side column from 64em"
  - "Log in to book is an anchor styled as the primary button, because Button renders only a <button>; the href is /login?next= with the tour path percent-encoded (S22 shape)"
  - "Confirm dialog takes no closedby attribute, so a backdrop click does nothing (RESEARCH.md open question 2 default)"
  - "Destructive action is outlined in --color-error, not filled: its text keeps AA contrast on the surface in both themes (8.1:1 light, 5.67:1 dark) and no text-on-fill pairing is needed"
  - "Confirm copy: 'Deactivate your account?' with the S6 consequence (signed out, cannot log in again). The copy is new and should be reviewed at the design gate"

requirements-completed: [U25]
requirements-partial: [U4]

coverage:
  - id: D1
    description: "Route line draws once in at most 1.2 seconds on first appearance, and appears already drawn under prefers-reduced-motion"
    requirement: "U25"
    verification:
      - kind: e2e
        ref: "test/app/map-frame.spec.ts#[U25] under reduced motion the route line is already drawn and never animates"
        status: pass
      - kind: e2e
        ref: "test/app/map-frame.spec.ts#[U25] the route line with motion allowed draws once, in 1.2 seconds or less"
        status: pass
    human_judgment: true
    rationale: "The feel of the draw and the Neel-outlined yellow contrast on both themes are visual judgements for the design gate."
  - id: D2
    description: "Each day's stop carries its day number, from 1 to 8 for the Ladakh itinerary"
    requirement: "U25"
    verification:
      - kind: e2e
        ref: "test/app/map-frame.spec.ts#[U25] each day stop carries its day number, from 1 to 8"
        status: pass
    human_judgment: false
  - id: D3
    description: "booking-panel renders the four states from direction.md: bookable, logged out, already booked and no upcoming dates"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[U4] state 1: a bookable tour shows the start dates, the price and Book this tour"
        status: pass
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[U4] state 2: logged out, the button reads Log in to book and returns to this tour"
        status: pass
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[U4] state 3: already booked says so, links to My tours and offers no date or button"
        status: pass
      - kind: e2e
        ref: "test/app/booking-panel.spec.ts#[U4] state 4: no future dates shows the empty message and nothing else"
        status: pass
    human_judgment: true
    rationale: "The sticky placement at both widths and the panel's visual weight are judgements for the design gate; the four states themselves are asserted."
  - id: D4
    description: "confirm-dialog opens with Cancel focused, so Enter cancels; Escape closes; a backdrop click does nothing; only the confirm button runs the action"
    requirement: "U4"
    verification:
      - kind: e2e
        ref: "test/app/confirm-dialog.spec.ts#[U4] opening the dialog focuses Cancel, not the destructive action"
        status: pass
      - kind: e2e
        ref: "test/app/confirm-dialog.spec.ts#[T-03-11] pressing Enter right after opening activates Cancel, never the destructive action"
        status: pass
      - kind: e2e
        ref: "test/app/confirm-dialog.spec.ts#[U4] clicking the backdrop leaves the dialog open"
        status: pass
      - kind: e2e
        ref: "test/app/confirm-dialog.spec.ts#[U4] Escape closes the dialog without confirming"
        status: pass
      - kind: e2e
        ref: "test/app/confirm-dialog.spec.ts#[U4] the confirm button runs the destructive action and closes the dialog"
        status: pass
    human_judgment: false

duration: about 60min (approximate; the plan's start time was not recorded)
completed: 2026-11-15
status: complete
commits: 3
plan_head_before: 3e8f9fff96f00ff1d62e68d9f7da9abf2e2b1a79
plan_head_after: 3ed8b1b3b2669289b3b4e3e798bf5e5ae9582f5f
---

# Phase 3 Plan 08: Route map frame, booking panel and confirm dialog Summary

**Route map frame with the one self-playing draw (U25), a four-state booking panel and a native-dialog confirm with Cancel as the safe default, all driven by typed props and covered by Playwright specs at 375 and 1280px.**

## Performance

- **Duration:** about 60 min (approximate; start time not recorded)
- **Completed:** 2026-11-15
- **Tasks:** 3
- **Files modified:** 14 (12 created, 2 modified)

## Accomplishments

- `ui/map-frame` projects the Ladakh itinerary's real coordinates into a fixed 400 by 240 viewBox and draws the route. Its outline and yellow line draw once in `--duration-signature` (1.2s) on first appearance. Under `prefers-reduced-motion` the animation is removed, so the route is already drawn.
- `ui/booking-panel` takes a discriminated `status` prop with four states: bookable (date select, price, Book this tour), logged out (Log in to book, linking back to the tour), already booked (booked date and a My tours link), and no upcoming dates (empty message). It fetches nothing.
- `ui/confirm-dialog` uses a native `<dialog>` with `showModal()`. Cancel is the first control in the form and carries `autoFocus`, so it has focus on open and Enter cancels. Escape closes it. A backdrop click does nothing. The component has no key handler and no focus-trap code.
- The styleguide shows the map frame, the four booking-panel states and the confirm dialog, with real Ladakh High Passes data.
- Full app Playwright project: 42 of 42 pass. Vitest: 48 files, 696 tests pass. `tsc`, `npm run lint`, `lint:css`, `check:client`, `check:conventions`, `knip` and `format:check` are clean.

## Task Commits

1. **Task 1: map frame and its one self-playing draw** - `1689dd3` (feat). Also carries the confirm-dialog spec, written first as the red spec for Task 3.
2. **Task 2: booking panel, four states** - `a013f47` (feat)
3. **Task 3: confirm dialog with Cancel as the safe default** - `3ed8b1b` (feat). Also scopes one existing styleguide assertion (see Deviations).

**Plan metadata:** recorded in the docs commit that adds this file.

## Files Created/Modified

- `src/components/ui/map-frame.tsx` and `.module.css` - static route frame; projection, marker placement, draw animation and reduced-motion override
- `src/components/ui/booking-panel.tsx` and `.module.css` - four-state panel, server component
- `src/components/ui/confirm-dialog.tsx` and `.module.css` - client component with native `<dialog>`, form `method="dialog"` and a destructive confirm button
- `src/app/styleguide/sections/map-frame-section.tsx` - Ladakh stops from `seed/data/tours.json`
- `src/app/styleguide/sections/booking-panel-section.tsx` - the four states
- `src/app/styleguide/sections/confirm-dialog-section.tsx` - client section that records the confirmed action in a status line
- `src/app/styleguide/page.tsx` - renders the three sections
- `test/app/map-frame.spec.ts`, `test/app/booking-panel.spec.ts`, `test/app/confirm-dialog.spec.ts` - Playwright specs
- `test/app/styleguide.spec.ts` - Book this tour count scoped to the Button section

## Decisions Made

- **Draw technique:** `pathLength="1"` with `stroke-dasharray: 1 1` and an offset animation from 1 to 0, so no path measurement is needed. The outline and the yellow line both draw.
- **Reduced motion removes the animation** (`animation: none`, `stroke-dasharray: none`, offset 0) rather than shortening it, as direction.md specifies.
- **Projection:** longitude is scaled by cos(mean latitude), one scale factor is used on both axes so the route is not stretched, and north is at the top. A stop that lands on an earlier one (Day 8 at Leh, the same point as Day 1) is nudged 14 units along the diagonal so both markers stay visible.
- **Milestone marker** is a rounded Highway yellow stone with Neel text. This keeps the rule that yellow never carries text other than Neel.
- **Booking panel placement:** a sticky bottom bar below 64em, and sticky at the top of its column from 64em.
- **Log in to book** is an anchor styled as the primary button, because `Button` renders only a `<button>`.
- **No `closedby` on the confirm dialog**, so a backdrop click does nothing (RESEARCH.md open question 2).
- **Destructive action is outlined in `--color-error`**, not filled. Its text keeps AA contrast on the surface in both themes (8.1:1 light, 5.67:1 dark), so no text-on-fill pairing is needed.
- **Confirm copy** is new ("Deactivate your account?", stating the S6 consequence: signed out and unable to log in again). It should be reviewed at the design gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Booking panel inlines the date select and the price**
- **Found during:** Task 2 (booking panel)
- **Issue:** the plan says the bookable and logged-out states render `ui/start-date-select` (plan 03-05) and `ui/price` (plan 03-06). Both plans run in the same wave and are not in this worktree's base, so the imports would not resolve. The plan's fallback clause covers only the empty state.
- **Fix:** the panel renders a native `<select>` with `formatDate` option labels and a price line from `formatPrice`, directly. Both still use the approved formatters, and no date or rupee string is built inline.
- **Files modified:** `src/components/ui/booking-panel.tsx`
- **Verification:** `test/app/booking-panel.spec.ts` asserts the option labels (`12 Jun 2027`, `17 Jul 2027`, `4 Sep 2027`) and `₹42,999 per person`.
- **Committed in:** `a013f47`
- **Follow-up:** Plan 03-10 should replace the inline select and price with `ui/start-date-select` and `ui/price` when those land.

**2. [Rule 3 - Blocking] Empty state inlined**
- **Found during:** Task 2
- **Issue:** `ui/empty-state` comes from plan 03-09, which is not in this worktree.
- **Fix:** the plan's own fallback applies: the two-line empty state markup is inline. Plan 03-10 should reconcile it.
- **Committed in:** `a013f47`

**3. [Rule 3 - Interface] Booking panel props differ from the plan's list**
- **Found during:** Task 2
- **Issue:** the plan lists `tourHref` for bookable, `loginHref` for logged out, and `myToursHref` for booked. Nothing used the bookable `tourHref`, and the login href is a fixed shape that should be encoded in one place.
- **Fix:** logged-out takes `tourHref` and builds `/login?next=` with `encodeURIComponent`. Booked takes `bookedDate` and links to the fixed `/my-tours`. Bookable takes only `dates` and `priceRupees`. Dates are the seed's `YYYY-MM-DD` strings, not `Date | string`.
- **Committed in:** `a013f47`

**4. [Rule 3 - Blocking] Styleguide page imports the new sections**
- **Found during:** Task 1
- **Issue:** `knip` fails on section files that nothing imports. `src/app/styleguide/page.tsx` is not in this plan's `files_modified`, the same situation as plan 03-02's deviation 8.
- **Fix:** `page.tsx` imports and renders the three sections.
- **Committed in:** `1689dd3` (map frame), `a013f47` (booking panel), `3ed8b1b` (confirm dialog)

**5. [Rule 1 - Bug] Existing styleguide spec counted every "Book this tour" button on the page**
- **Found during:** Task 3 (full app run)
- **Issue:** the booking panel's bookable state adds a sixth "Book this tour" button, so `test/app/styleguide.spec.ts` (plan 03-01) failed its count of five.
- **Fix:** the count is scoped to the Button section region. The asserted values and the intent are unchanged.
- **Files modified:** `test/app/styleguide.spec.ts`
- **Verification:** the styleguide spec passes at 375 and 1280px, 27 of 27 across the three regression specs.
- **Committed in:** `3ed8b1b`

**6. [Rule 2 - Missing verification] Booking panel spec added**
- **Found during:** Task 2
- **Issue:** the plan's verification for Task 2 is `tsc`, stylelint and a grep for `formatDate`. Nothing asserts the four states, which the plan's must_haves require.
- **Fix:** `test/app/booking-panel.spec.ts` asserts each state at both widths. This file is not in the plan's `files_modified`.
- **Committed in:** `a013f47`

**7. [Process] Confirm dialog spec landed in the map frame commit**
- **Found during:** Task 1
- **Issue:** `tdd="true"` asks for the spec first. `test/app/confirm-dialog.spec.ts` was written with Task 1's spec and committed in `1689dd3`, so that commit has ten failing confirm-dialog tests until `3ed8b1b`. The specs were not split per task.
- **Fix:** none needed for correctness. Commits `1689dd3` and `a013f47` are red on the confirm-dialog spec, and `3ed8b1b` makes it green.

---

**Total deviations:** 7 (4 Rule 3 blocking, 1 Rule 1 bug, 1 Rule 2 missing verification, 1 process)
**Impact on plan:** the inline date select, price and empty state are temporary duplication that Plan 03-10 reconciles. Every other change is needed for the build, lint or the regression suite. No scope was added beyond the plan's three components.

## Issues Encountered

- **node_modules was missing in this worktree**, so the first Playwright run could not start Next.js (`Could not find the Next.js package`). `npm ci` fixed it. The install is not a code change.
- **Cold dev-server compile caused flaky failures.** The first full run failed the shell skip-link, styleguide and confirm-dialog specs with navigation churn and timeouts while the dev server compiled `/styleguide`. Against a warm server the same specs pass, including the confirm dialog (10 of 10) and the full app project (42 of 42).
- **Pre-existing CSP console noise in dev.** The browser logs 33 "Applying inline style violates ... style-src-elem" errors on `/` as well as `/styleguide`. The home page uses none of these components, so this is not from this plan. It is not addressed here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The three components are ready for Plan 03-10's assembly. Reconcile the inline date select, price and empty state in `booking-panel.tsx` against `ui/start-date-select`, `ui/price` and `ui/empty-state`.
- Phase 4 replaces the static map frame with `RouteMap` (ADR 0028). The `locations` prop shape is kept so either can wrap or replace it.
- Phase 4 wires the booking panel's real data: the start dates for the tour and the user's booking state.
- The confirm dialog is ready for account deactivation (Phase 4/6) and review deletion. Its copy is new and needs the design gate's review.

## Known Stubs

- `src/components/ui/booking-panel.tsx`, bookable state: the "Book this tour" button has no action. Phase 4 connects it to the Stripe Checkout flow.
- `src/components/ui/booking-panel.tsx`, the logged-out link goes to `/login`, and the already-booked link goes to `/my-tours`. Both routes return 404 until Phases 4 and 5 build them, as recorded in plan 03-02.
- `src/app/styleguide/sections/confirm-dialog-section.tsx`: the confirm action only sets a status line, because it is a styleguide demonstration. The real deactivation action is Phase 4/6's job.

## Threat Flags

None. The threat register is covered: T-03-11 (accidental destructive action) is mitigated by the autofocused Cancel and the Enter test. T-03-12 is accepted, because `BookingPanel` only renders the data it is given and fetches nothing. T-03-SC is accepted: no package was installed.

## Self-Check

- [x] Created files exist: `src/components/ui/{map-frame,booking-panel,confirm-dialog}.{tsx,module.css}`, the three styleguide sections and the three Playwright specs
- [x] Commits `1689dd3`, `a013f47` and `3ed8b1b` are ancestors of HEAD
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run lint:css`, `npm run check:client` (3 client files), `npm run check:conventions`, `npm run knip` and `npm run format:check` pass
- [x] `npx playwright test --project=app`: 42 of 42 pass (map frame, booking panel, confirm dialog, shell, styleguide)
- [x] `npx vitest run`: 48 files, 696 tests pass
- [x] No edits to `.planning/STATE.md` or `.planning/ROADMAP.md`

## Self-Check: PASSED
