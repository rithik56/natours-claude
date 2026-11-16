# 0032. No loading.tsx on the tour page or at the root

Status: Accepted. Decision 2 is amended by ADR 0039 for the tour page: its sections are awaited, not streamed. Decision 3 is amended by ADR 0040: `/credits` has no `loading.tsx` either, so it works with JavaScript off.
Date: 16 Nov 2026
Requirements: R4, U11
Plan review: none

## Context

R4 says each route segment has a `loading.tsx`, so the page shows something while its data loads. That is the common Next.js pattern for a streamed page.

A loading boundary changes the status code of a missing record. Next sends the HTTP status with the first streamed chunk, before the page knows whether its slug exists. A `notFound()` called after the boundary has started streaming therefore arrives as HTTP 200 with the not-found page inside it. RESEARCH Pitfall 1 verified this on Next 16.4.5: with a `loading.tsx` under `src/app/tour/[slug]`, `/tour/does-not-exist` answered 200.

A visitor who lands on a missing tour, or a search engine that indexes one, must get a real 404. A 200 would index the not-found page as a tour.

## Decision

1. **No `loading.tsx` under `src/app/tour/[slug]`, and none at `src/app/loading.tsx`.** The root boundary would cover the tour segment too, so it is also left out.
2. **The page's sections come after the 404 decision.** The page calls `notFound()` before its first JSX return, so the status is settled first. The sections that depend on the visitor or on secondary data (the booking panel, the guides and the reviews, plan 04-07) were to stream behind `Suspense` boundaries. ADR 0039 changed this for the tour page: they are awaited, with no `Suspense`, so they show with JavaScript off.
3. **The `/credits` page may keep a `loading.tsx`** (plan 04-10). It has no slug, so a missing record cannot arise there.
4. **The smoke check guards the status.** `scripts/smoke.ts` asserts that `GET /tour/does-not-exist` answers 404 and that a seeded slug answers 200 on the built app, so a `loading.tsx` added later fails the build's smoke run and not a visitor's first request.

## Consequences

- R4's "route segments have `loading.tsx`" is a deviation for the tour segment and the root. It is recorded here and in `docs/contracts.md` section "Where the code differs from plan.md section 4".
- The tour page shows its cover, name, facts, itinerary and description in the first response, as U11 asks. Since ADR 0039, the booking panel, guides and reviews are in that response too.
- A future loading state for the tour page needs a new decision, because it reintroduces the 200-for-404 risk unless the not-found check moves ahead of the boundary.

**Reversibility:** reversible. A `loading.tsx` can be added later, provided the smoke check still shows the 404 status.
