# Deferred items: phase 04

## Deferred Items

- `TourPhotoCredit` is exported from `src/server/modules/tours/dto.ts` (line 62) but nothing imports it, so `npm run knip` reports it and the CI checks job would fail on it. It was already in the tree at a6a6202, before plan 04-03, and it is outside that plan's files. Found during plan 04-03 (Task 3, knip check). Remove the export or make it module-private in a later plan that touches `dto.ts`.
  status: resolved
  resolution: quick task 261116-ohv dropped the export keyword from TourPhotoCredit in src/server/modules/tours/dto.ts. The type stays, used by TourDetail.photoCredits. If a later phase 4 plan (04-06 or 04-10) adds an importer, it re-exports the type then.

- The first photo on `/` is the largest contentful paint, and the browser logs Next's hint that it needs `loading="eager"`. `TourRow` (src/components/ui/tour-row.tsx) renders every photo lazily, so the first row's image waits for the layout. Found during plan 04-04 (Task 1, the browse-list Playwright run). Not fixed there because `TourRow` is a shared ui/ component whose prop contract was set in phase 3; a `priority` prop for the first row would fix it.
  status: open

- The site header shifts the page on every route at 375px, so the cumulative layout shift is 0.139 on `/`, on `/styleguide` and on `/tour/ladakh-high-passes` alike. The shift is the header's height changing once it hydrates (its `main` moves up 134px and the brand and an SVG appear), and it happens with no streamed content on the page. It was measured, not fixed, in plan 04-07 (Task 3), because the header belongs to phase 3's shell. The 375px tour-page CLS check in `test/app/tour-page.spec.ts` is `test.fixme` until the header is stable (for example, reserve its height in the server markup). The 1280px check passes (under 0.1).
  status: open

- `CreditPhoto` is exported from `src/server/modules/tours/dto.ts` (line 84) but nothing imports it, so `npx knip --no-progress` reports it and the CI checks job would fail on it. It is already on the base commit 04bda8b, and it is outside plan 04-11's files, so it was left alone. The same fix as `TourPhotoCredit` applies: drop the export keyword in a later plan that touches `dto.ts`. Found during plan 04-11 (Task 3, knip check).
  status: open
