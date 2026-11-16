# 0036. The tour cover is optional, and a tour without one stays out of the public catalogue

Status: Accepted
Date: 16 Nov 2026
Requirements: F6, B4, S4, U27
Plan review: DES-07

## Context

plan.md 1.3 makes `imageCover` a required field of a tour. Requirements B4 and S4 keep images out of JSON: a PATCH may not write `images`, `imageCover` or `photoCredits`, and the photos arrive through their own endpoint with their credits (plan 04-13). Together these mean a tour created over JSON could never be valid, because it has no cover to send, and the required field would refuse every create.

The user settled this on 16 Nov 2026 (decision D-13): the cover becomes optional, and a tour without one must never be shown with a stand-in image. The U27 rule that every photo has its credit, and the rule that no placeholder image appears anywhere a person can see, both still hold.

## Decision

1. `imageCover` is optional in the tour model. A tour saves without one.
2. `POST /api/v1/tours` takes JSON only and creates a tour with no cover. Its response carries `imageCover: null`.
3. A tour with no cover is left out of every public read. That covers the catalogue (`/`, the list and top-5 APIs, the monthly month options, the sitemap through `listSlugs`), the statistics, `/credits`, the geo reads (`within` and `distances`), and `/tour/<slug>`, which answers 404. The catalogue filters on the cover, so every read built on it inherits the rule. The geo reads filter on `imageCover` in their own queries.
4. `GET /api/v1/tours/[id]` still answers a cover-less tour, with `imageCover: null`, because an admin or lead guide needs to see and complete it.
5. A tour gains its cover only through the images endpoint, with its credit (D-14, plan 04-13). Until then it stays hidden.

## Consequences

- This is a deviation from plan.md 1.3, recorded here. plan.md is not edited.
- The model, the DTO (`imageCover: string | null`) and the public filter change together. A reader of a summary can rely on `hasCover` to narrow the type where a photo is shown.
- The staff-only monthly plan (F2) still counts the start dates of a cover-less tour. Staff plan the year from every tour, and the plan does not show a photo.
- **For Phase 6:** checkout must refuse a tour that is not in the catalogue, so a visitor cannot book a hidden tour. A tour can be deleted, or lose its cover, between a visitor's page load and their booking. The check is therefore made at checkout, not assumed from the page. Phase 4 creates no bookings, so a booking created between the bookings count and the tour delete (F6 concurrency) can leave a booking for a deleted tour only in principle. That race is accepted for Phase 4 and recorded here for Phase 6.
