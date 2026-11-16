# Deferred items: phase 04

## Deferred Items

- `TourPhotoCredit` is exported from `src/server/modules/tours/dto.ts` (line 62) but nothing imports it, so `npm run knip` reports it and the CI checks job would fail on it. It was already in the tree at a6a6202, before plan 04-03, and it is outside that plan's files. Found during plan 04-03 (Task 3, knip check). Remove the export or make it module-private in a later plan that touches `dto.ts`.
  status: open
