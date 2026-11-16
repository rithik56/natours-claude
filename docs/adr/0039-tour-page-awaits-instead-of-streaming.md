# 0039. The tour page awaits its booking, guides and reviews instead of streaming them

Status: Accepted. Amends R4 for the tour page, and the streaming parts of ADR 0032 and ADR 0033.
Date: 16 Nov 2026
Requirements: R4, R5, R11, U11, D-08
Plan review: none

## Context

plan.md R4 puts the slower sections of the tour page (reviews, guides and the "your booking" state) inside `<Suspense>`, with skeletons the same size as the real content. plan.md R11 lists the tour page among the things that work without JavaScript. D-08 says reviews are paged through a query parameter, which also works without JavaScript. The UI spec's JavaScript-off list says the booking panel shows its server-rendered state.

With Suspense as built, React writes a streamed boundary's content into a `div[hidden]` container, and an inline script moves it into place. With JavaScript off the skeleton stays and the content never shows. This was measured on `/tour/ladakh-high-passes` with JavaScript disabled, before this decision:

- `#reviews` held only its heading. The four review skeletons had no text.
- The guides list held only its heading.
- The booking panel's content (the dates, the price and "Log in to book") was in the HTML, inside one of three `div[hidden]` stream containers, so it did not show.

R4's streaming cannot hold together with R11 and D-08 on this page. Plan 04-07 halted at a decision checkpoint on 16 Nov 2026 with three options:

- **A. Keep streaming, and amend R11 and D-08.** Reviews, guides and their paging would need JavaScript.
- **B. Stream the booking panel only, and await the guides and reviews.** Guides, reviews and paging would work without JavaScript, but a logged-out visitor with JavaScript off would not see the "Log in to book" link. R11 lists booking as working without JavaScript.
- **C. Await all three in the page, with no Suspense on the tour page.**

## Decision

The user chose **option C** on 16 Nov 2026.

1. **No Suspense on the tour page.** `BookingSection`, `GuidesSection` and `ReviewsSection` are awaited with the rest of the page. Their content is in the first response, with JavaScript on or off.
2. **The three reads start together.** They are sibling async Server Components with no `await` between them. Next's documentation says independent reads start in parallel when they render in sibling components, so the page is sent once the slowest read has finished. R3 names `Promise.all` as the example. The sibling form gives the same concurrency and keeps each section's contract, which its tests use.
3. **The booking read stays uncached (R5).** `getCurrentUser()` and `findUpcomingPaid()` are not inside any cached function, as before.
4. **The public reads keep their cached paths.** The guides are read under `tour:<id>` and the reviews under `['reviews', tourId]`, tagged `reviews:<tourId>`.
5. **The skeletons stay for the styleguide.** The `review-item`, `guide-item` and `booking-panel` variants are still required by U4 and are shown on `/styleguide`. `GuidesFallback` and `ReviewsFallback` are removed, because nothing renders them now.

**Rejected:**

- **A** breaks the no-JavaScript path for the reviews, the guides and the paging, which the tour page needs before a visitor books. Amending R11 would take the tour page off the list of pages that work without JavaScript, when the cause is a rendering choice that can be made differently.
- **B** keeps the booking panel behind a skeleton, so a logged-out visitor with JavaScript off loses the "Log in to book" link. R11 requires booking to work without JavaScript, so B breaks R11 for booking.

## Consequences

- **R4 is amended for the tour page.** The tour page has no `<Suspense>`. Layout stability (CLS under 0.1) still holds, because nothing is shown before it is ready and the page is sent whole. The 1280px layout-shift check passes with the sections awaited (`test/app/tour-page.spec.ts`). The 375px check stays held for the header, as recorded in `deferred-items.md`.
- **R4's other routes and R4's `loading.tsx` rule are unchanged**, and ADR 0032 still holds for the 404 status.
- **Time to first byte now includes the slowest of the three reads.** Before, the tour document could be sent while the reads were pending. The reads are cached or local, so the added wait is small, but it has not been timed here.
- **A failed read now fails the whole response.** Before, a failure in a streamed section came after the first bytes had gone out, where the status could no longer change. Now it reaches the route's error page before anything is sent, as UI-SPEC's error state already describes.
- **R5 is unchanged.** The booking state is still read on every request and is never cached. The two-traveller test in `test/components/features/booking-section.test.ts` still proves each traveller sees their own state.
- **The skeleton variants are no longer shown on the tour page.** They remain as the styleguide's demonstration and as the size reference for the real sections (ADR 0033).
- **ADR 0032's decision 2 and ADR 0033's consequences are amended** to match. Their other decisions stand.

**Reversibility:** reversible. A streamed boundary can come back with a new ADR, but then the JavaScript-off gap in this record returns with it, and R11 and D-08 would need amending first.
