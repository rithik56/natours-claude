# 0033. The booking panel sits in the page flow on a phone, and "booked" means an upcoming paid booking

Status: Accepted
Date: 16 Nov 2026
Requirements: U11, R4, R5
Plan review: DES-04 (superseded by D-06), DES-17, QA-06, QA-07, SEC-07

## Context

plan.md 9.2, `docs/design/direction.md` and the approved mockups all show the booking panel as a bar pinned to the bottom of a phone screen. DES-04 in the plan review asked for that bar to be kept, and it was built to the mockup.

The user decided otherwise at the UI-SPEC check on 16 Nov 2026 (D-06): "No pinned bottom bar". On a 375px screen a pinned bar covers the content it sits beside, and the design contract's reading order puts the booking panel straight after the facts strip. UI-SPEC Open item 2 records the departure and asks for an ADR in the same change as component change C1.

plan.md 4.4 names `bookingsService.hasPaidBooking(userId, tourId)`, which returns a boolean. The booking panel's "booked" state prints the date of the booking ("You're booked for 17 Jul 2027."), so a boolean cannot carry what the panel needs.

QA-06, QA-07 and SEC-07 say that only a `paid` booking counts, and that a trip which has already ended does not make the tour "booked". A traveller whose only paid trip is past may book the tour again.

## Decision

1. **No pinned bottom bar (D-06, C1).** Below 64em the booking panel is an ordinary block in the page flow, straight after the facts strip. It has a hairline border on all sides and `radius-md`, and it is `position: static`. From 64em it is `position: sticky` at `top: var(--space-5)` in the 22rem right column, so it stays in view as the page scrolls. The `booking` skeleton variant copies the same box at both widths.

2. **"Booked" means an upcoming paid booking of the signed-in traveller.** A booking counts when its `status` is `paid` and its trip is upcoming, as `tripStatus` decides from the start date and the tour's length (D-04). A refunded booking never counts, and nor does a paid trip that has ended.

3. **`findUpcomingPaid(userId, tourId, durationDays)` returns the IST day.** It returns the earliest upcoming paid booking's start day as a `YYYY-MM-DD` string, or null. This replaces the boolean named in plan.md 4.4, because the panel prints the date. The contract is recorded in `docs/contracts.md`, section "Where the code differs from plan.md section 4".

4. **The booking read is never cached (R5).** `findUpcomingPaid` runs on every request, outside every cached function, and its user id comes only from `getCurrentUser()`. Two travellers on the same tour get their own state from the same server, and a test proves it.

## Consequences

- The tour page's aside column is a plain block on a phone and a sticky column from 64em. The booking skeleton is the same size as the panel it stands in for.
- The "booked" state needs a date from the booking, so the panel calls a function that returns a day, not a boolean. Anything else that needs only "has this traveller booked" can call the same function and test for null.
- A tour on which the traveller has an upcoming booking shows "booked", not "bookable", even when another start date is still open. The booked date is the one that matters to that traveller.
- The state order in the panel is: no bookable start date, then booked, then logged out, then bookable. A traveller with a booking whose start date is today or earlier, and no later start date, sees "No upcoming start dates".

**Reversibility:** reversible. The panel's position is CSS, and a pinned bar could return with a new ADR. The booking contract can return the boolean with a second function.
