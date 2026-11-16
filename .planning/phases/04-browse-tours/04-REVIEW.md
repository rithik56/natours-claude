---
phase: 04-browse-tours
reviewed: 2026-11-16T12:00:00Z
depth: quick
files_reviewed: 169
files_reviewed_list:
  - ".env.example"
  - ".github/workflows/ci.yml"
  - ".gitignore"
  - ".prettierignore"
  - "README.md"
  - "docs/adr/0012-tagged-data-cache-and-dynamic-rendering.md"
  - "docs/adr/0016-adapters-selected-by-app-env.md"
  - "docs/adr/0017-required-access-and-error-mapping.md"
  - "docs/adr/0018-javascript-budget-measured-with-lighthouse-ci.md"
  - "docs/adr/0023-seed-rolls-forward-only-passed-start-dates.md"
  - "docs/adr/0028-map-tile-provider-and-boundary-compliance.md"
  - "docs/adr/0029-disk-storage-and-the-media-route.md"
  - "docs/adr/0030-seed-guards-passwords-and-date-roll.md"
  - "docs/adr/0031-one-cached-catalogue-queried-in-memory.md"
  - "docs/adr/0032-no-loading-file-on-the-tour-page.md"
  - "docs/adr/0033-booking-panel-in-the-page-flow.md"
  - "docs/adr/0034-route-map-fallback-and-boundary-file.md"
  - "docs/adr/0035-vendor-cascade-layer.md"
  - "docs/adr/0036-tour-cover-optional-and-hidden-until-added.md"
  - "docs/adr/0037-admins-and-lead-guides-manage-any-tour.md"
  - "docs/adr/0038-uploads-multipart-limits-and-image-slots.md"
  - "docs/adr/0039-tour-page-awaits-instead-of-streaming.md"
  - "docs/adr/0040-credits-page-has-no-loading-file.md"
  - "docs/adr/README.md"
  - "docs/bundle-baseline.json"
  - "docs/contracts.md"
  - "docs/design/copy.md"
  - "docs/openapi/openapi.yaml"
  - "lighthouserc.cjs"
  - "next.config.ts"
  - "package-lock.json"
  - "package.json"
  - "playwright.config.ts"
  - "public/data/india-soi.geojson"
  - "scripts/measure-bundle.ts"
  - "scripts/seed.ts"
  - "scripts/seed/dates.ts"
  - "scripts/seed/load.ts"
  - "scripts/seed/rules.ts"
  - "scripts/seed/run.ts"
  - "scripts/smoke.ts"
  - "seed/CREDITS.md"
  - "seed/data/tours.json"
  - "src/app/api/v1/tours/[id]/images/route.ts"
  - "src/app/api/v1/tours/[id]/route.ts"
  - "src/app/api/v1/tours/distances/[latlng]/unit/[unit]/route.ts"
  - "src/app/api/v1/tours/monthly-plan/[year]/route.ts"
  - "src/app/api/v1/tours/route.ts"
  - "src/app/api/v1/tours/stats/route.ts"
  - "src/app/api/v1/tours/top-5-cheap/route.ts"
  - "src/app/api/v1/tours/within/[distance]/center/[latlng]/unit/[unit]/route.ts"
  - "src/app/credits/page.module.css"
  - "src/app/credits/page.tsx"
  - "src/app/layout.tsx"
  - "src/app/media/[...key]/route.ts"
  - "src/app/page.module.css"
  - "src/app/page.tsx"
  - "src/app/robots.ts"
  - "src/app/sitemap.ts"
  - "src/app/tour/[slug]/page.module.css"
  - "src/app/tour/[slug]/page.tsx"
  - "src/components/features/booking-section.tsx"
  - "src/components/features/booking-state.ts"
  - "src/components/features/credits-group.module.css"
  - "src/components/features/credits-group.tsx"
  - "src/components/features/guides-section.module.css"
  - "src/components/features/guides-section.tsx"
  - "src/components/features/leaflet-vendor.css"
  - "src/components/features/reviews-section.module.css"
  - "src/components/features/reviews-section.tsx"
  - "src/components/features/route-map-slot.tsx"
  - "src/components/features/route-map.module.css"
  - "src/components/features/route-map.tsx"
  - "src/components/features/tour-filters.module.css"
  - "src/components/features/tour-filters.tsx"
  - "src/components/features/tour-gallery.module.css"
  - "src/components/features/tour-gallery.tsx"
  - "src/components/features/tour-route.module.css"
  - "src/components/features/tour-route.tsx"
  - "src/components/ui/booking-panel.module.css"
  - "src/components/ui/map-frame.module.css"
  - "src/components/ui/map-frame.tsx"
  - "src/components/ui/photo-credits.tsx"
  - "src/components/ui/skeleton.module.css"
  - "src/components/ui/tour-row.tsx"
  - "src/lib/format.ts"
  - "src/lib/messages.ts"
  - "src/lib/route-projection.ts"
  - "src/lib/tour-list-url.ts"
  - "src/proxy.ts"
  - "src/server/adapters/cache.ts"
  - "src/server/adapters/local-disk-storage.ts"
  - "src/server/adapters/real-cache.ts"
  - "src/server/adapters/storage.ts"
  - "src/server/api/body.ts"
  - "src/server/api/responses.ts"
  - "src/server/api/with-api.ts"
  - "src/server/config-schema.ts"
  - "src/server/deps.ts"
  - "src/server/images.ts"
  - "src/server/modules/bookings/service.ts"
  - "src/server/modules/reviews/schemas.ts"
  - "src/server/modules/reviews/service.ts"
  - "src/server/modules/tours/catalogue-query.ts"
  - "src/server/modules/tours/dto.ts"
  - "src/server/modules/tours/model.ts"
  - "src/server/modules/tours/schemas.ts"
  - "src/server/modules/tours/service.ts"
  - "src/server/modules/users/service.ts"
  - "src/server/validation.ts"
  - "src/styles/reset.css"
  - "stylelint.config.mjs"
  - "test/app/api/tours-detail.test.ts"
  - "test/app/api/tours-geo.test.ts"
  - "test/app/api/tours-images.test.ts"
  - "test/app/api/tours-list.test.ts"
  - "test/app/api/tours-monthly-plan.test.ts"
  - "test/app/api/tours-stats.test.ts"
  - "test/app/api/tours-top5.test.ts"
  - "test/app/api/tours-write.test.ts"
  - "test/app/booking-panel.spec.ts"
  - "test/app/browse-list.spec.ts"
  - "test/app/credits.spec.ts"
  - "test/app/e2e-env.ts"
  - "test/app/media-route.test.ts"
  - "test/app/metadata.test.ts"
  - "test/app/route-map.spec.ts"
  - "test/app/seed-setup.ts"
  - "test/app/tour-page-metadata.test.ts"
  - "test/app/tour-page.spec.ts"
  - "test/components/features/booking-section.test.ts"
  - "test/components/features/booking-state.test.ts"
  - "test/components/features/guides-section.test.ts"
  - "test/components/features/reviews-section.test.ts"
  - "test/components/features/tour-gallery.test.ts"
  - "test/components/ui/map-frame.test.ts"
  - "test/components/ui/photo-credits.test.ts"
  - "test/components/ui/tour-row.test.ts"
  - "test/helpers/factories.ts"
  - "test/helpers/images.ts"
  - "test/lib/format.test.ts"
  - "test/lib/route-projection.test.ts"
  - "test/lib/tour-list-url.test.ts"
  - "test/next-config.test.ts"
  - "test/proxy.test.ts"
  - "test/scripts/measure-bundle.test.ts"
  - "test/scripts/seed-data.test.ts"
  - "test/scripts/seed-dates.test.ts"
  - "test/scripts/seed-rules.test.ts"
  - "test/scripts/seed.test.ts"
  - "test/server/adapters/cache.test.ts"
  - "test/server/adapters/fakes.test.ts"
  - "test/server/adapters/local-disk-storage.test.ts"
  - "test/server/api/body.test.ts"
  - "test/server/api/responses.test.ts"
  - "test/server/api/with-api.test.ts"
  - "test/server/deps.test.ts"
  - "test/server/images.test.ts"
  - "test/server/modules/bookings/service.test.ts"
  - "test/server/modules/reviews/service.test.ts"
  - "test/server/modules/tours/catalogue-query.test.ts"
  - "test/server/modules/tours/credits.test.ts"
  - "test/server/modules/tours/dto.test.ts"
  - "test/server/modules/tours/model.test.ts"
  - "test/server/modules/tours/schemas.test.ts"
  - "test/server/modules/tours/service-db-down.test.ts"
  - "test/server/modules/tours/service.test.ts"
  - "test/server/modules/users/public-by-ids.test.ts"
  - "test/styles/stylelint-rules.test.ts"
findings:
  critical: 1
  warning: 5
  info: 6
  total: 12
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-11-16T12:00:00Z
**Depth:** quick
**Files Reviewed:** 169
**Status:** issues_found

## Summary

Scope: the 169 files listed in the review config, reviewed at quick depth. Every file received the quick-depth pattern scans (hardcoded secrets, dangerous calls, debug artifacts, empty catches, commented-out code, and the three CI/CD checks on `ci.yml`). Source files under `src/server/api`, `src/server/images.ts`, `src/server/validation.ts`, `src/server/deps.ts`, `src/server/adapters`, `src/server/modules/**`, the tour API routes, `src/app/media`, `src/proxy.ts`, the pages, the tour and map components, `scripts/` and the CI workflow were read in full and traced across their call chains. Test files, ADR documents, CSS modules, the seed JSON and the GeoJSON were checked by pattern and spot checks only. No structural findings (fallow) and no external reviewer evidence were supplied.

Overall the security posture of this phase is sound. Body and upload limits are enforced while reading, the access check runs before any body or parameter is read, uploads are judged by magic bytes and re-encoded through sharp with a pixel cap, storage keys are server-generated and path-confined, the session is HS256-pinned, and the public DTOs are explicit allowlists. The main defect is that the CORS preflight the contract requires is never exported by the tour routes. The warnings concern the slug generator, a hard-coded logged-out header, cache entries without a time bound, rate-limit ordering, and missing uniqueness and size limits in the tour write schemas.

Known and accepted items were not reported as findings: the booking-count versus tour-delete race (ADR 0036), the concurrent-upload lost update (ADR 0038), and `--reset` removing developer data in the seed (ADR 0030).

Pattern-scan results dismissed as false positives: the `openssl rand` assignments in `ci.yml` are command substitutions, not literals; the password string in `test/server/api/with-api.test.ts` is a test fixture; the `.exec(` matches are `RegExp.exec`, not process execution.

## Critical Issues

### CR-01: Tour write routes never answer the CORS preflight

**File:** `src/app/api/v1/tours/route.ts:33`, `src/app/api/v1/tours/[id]/route.ts:30` and `:42`, `src/app/api/v1/tours/[id]/images/route.ts:18`
**Issue:** `docs/contracts.md` line 348 requires that a route file serving cross-origin callers export `handlePreflight` as `OPTIONS`. `handlePreflight` is defined in `src/server/api/origin.ts:39` and is referenced by no route file (the only other references are tests). When `CORS_ORIGINS` lists an origin, that origin's browser sends an `OPTIONS` preflight before `POST`, `PUT`, `PATCH` or `DELETE` with a JSON body. Next answers the auto-generated `OPTIONS` without `Access-Control-Allow-Origin`, so the browser blocks every cross-origin write from an allowlisted origin. Simple cross-origin `GET` requests still work, because `finish()` adds the header to each response. The impact is limited to browser writes from origins the operator has configured, and it is not a security weakness.
**Fix:**
```ts
// src/app/api/v1/tours/route.ts, [id]/route.ts and [id]/images/route.ts
import type { NextRequest } from 'next/server';
import { handlePreflight } from '@/server/api/origin';

export const OPTIONS = (request: NextRequest) => handlePreflight(request);
```
Add a test that calls `OPTIONS` on each route with an allowlisted `Origin` and asserts the `Access-Control-Allow-Methods` header and a 204.

## Warnings

### WR-01: Non-Latin tour names produce an empty slug, and the second one collides

**File:** `src/server/modules/tours/slug.ts:8`, `src/server/modules/tours/schemas.ts:232`, `src/server/modules/tours/model.ts:161` and `:236`
**Issue:** `slugify` keeps only `[a-z0-9]`. A name of 10 or more characters that contains only Devanagari or Gurmukhi letters, which `TOUR_NAME` accepts, yields `''`. Verified: `slugify("नमस्ते भारत यात्रा") === ""`. The tour then has an empty slug, so its public route is `/tour/` and it is unreachable by slug. A second such tour fails the unique slug index and is reported as the name-conflict 409 (`messages.tours.duplicateName`), which is misleading.
**Fix:** Refuse a name whose slug would be empty, in the schema, so the API answers 400 before any write:
```ts
// src/server/modules/tours/schemas.ts
const TOUR_NAME = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine((name) => slugify(name).length > 0, {
    message: messages.validation.invalidValue,
  });
```
If non-Latin names are a product requirement, transliterate or fall back to an id-based slug instead, and record that in an ADR.

### WR-02: The root layout always renders the logged-out header

**File:** `src/app/layout.tsx:35` and `:39`
**Issue:** `Header` and `Footer` receive `isLoggedIn={false}` as a literal. A signed-in visitor sees "Log in" in the shell on every page, while `BookingSection` (`src/components/features/booking-section.tsx:22`) reads the real session on the same page, so the page contradicts itself. `ShellNavLinks` (`src/components/ui/shell-nav-links.tsx:15`) shows the Account link only when `isLoggedIn` is true.
**Fix:** Read the session in the layout, after `connection()`, and pass the result:
```tsx
const user = await getCurrentUser();
// ...
<Header isLoggedIn={user !== null} />
<Footer isLoggedIn={user !== null} currentYear={currentYear} />
```
If the shell is deliberately logged-out until the account pages land, record that gap in an ADR so it is not mistaken for a finished feature.

### WR-03: Per-tour and credits cache entries have no time bound

**File:** `src/server/adapters/real-cache.ts:11-15`; callers `src/server/modules/tours/service.ts:311-313`, `:348-352`, `:403-407`; `src/server/modules/reviews/service.ts:85-89`
**Issue:** `createNextCache` passes `revalidate: options?.revalidate`. Only the catalogue sets it (`service.ts:70`, 3600 seconds). `['tour-detail', id]`, `['tour-guides', id]`, `['reviews', tourId]` and `['credits']` have no `revalidate`, so they live until a tag is cleared. After `npm run seed` or the date roll changes a tour's `startDates`, the cached `tour-detail` keeps the old dates, and the booking panel keeps offering them. `docs/adr/0031` (consequences) and `docs/contracts.md` lines 1421 and 1589 tell operators that a restart fixes this. That holds for the catalogue, which expires within an hour, but not for these entries. Whether a restart clears Next's on-disk data cache is not verified here, so the remedy may not work at all.
**Fix:** Give every per-tour and credits entry a bound, and correct the documentation to match:
```ts
getDeps().cache.cached(loadDetail, ['tour-detail', entry.id], [`tour:${entry.id}`], { revalidate: 3600 })
```
Apply the same option to `loadGuides`, `loadReviews` and `loadCredits`. Then update ADR 0031 point 7 and contracts section 11.

### WR-04: The rate limit runs after the full upload is read and parsed

**File:** `src/server/api/with-api.ts:189-203`
**Issue:** The pipeline reads and parses the multipart body (up to 22 MB, `readUpload`) before the rate-limit check. The `tour-images` key depends only on the user, so a caller who is already over the limit still forces the server to read and parse a full upload on every request. Access is checked first, so only lead guides and admins can do this, which limits the exposure. The check is still placed after the expensive work it is meant to stop.
**Fix:** Let a rate-limit rule run before the body is read when its key needs only the request and the user. For example, add an option such as `rateLimit.beforeBody: true` and build the key from `{ request, user }` only, then run the limiter above the `readBody`/`readUpload` calls. Keep the body-dependent form for rules that need the parsed body.

### WR-05: Tour write schemas accept duplicate stop days and duplicate or unbounded guides

**File:** `src/server/modules/tours/schemas.ts:262-269` (LOCATIONS, GUIDES), `:275-292` (tourUpdateSchema), `:301-313` (tourCreateSchema); `src/server/modules/tours/model.ts:137-149`; `src/components/ui/map-frame.tsx:113`
**Issue:** `locations[].day` is only checked as a positive whole number. Two stops may share a day, both in the schema and in the model. `MapFrame` keys each marker by `marker.day` (`key={marker.day}`), so React receives duplicate keys and can drop or duplicate a stop's marker. `GUIDES` is an unbounded array of ids with no uniqueness check, so `guides: [a, a]` is stored as is. The seed data has unique days and unique guides, so only API-created tours are affected.
**Fix:**
```ts
const LOCATIONS = z
  .array(z.strictObject({ coordinates: lngLat, description: TOUR_TEXT, day: POSITIVE_WHOLE }))
  .refine((stops) => new Set(stops.map((stop) => stop.day)).size === stops.length);

const GUIDES = z
  .array(z.string().regex(OBJECT_ID_HEX))
  .max(MAX_GUIDES)
  .refine((ids) => new Set(ids).size === ids.length);
```
Keying `MapFrame` by index would also remove the rendering fault, but the schema rule is the one that keeps the stored data sound.

## Info

### IN-01: A page number of 400 digits becomes Infinity and is echoed as `null`

**File:** `src/server/modules/tours/schemas.ts:101` and `:155`; `src/server/modules/tours/catalogue-query.ts:151-159`
**Issue:** `positiveInteger` uses `Number()` on digit strings, so a 400-digit page becomes `Infinity`. `applyCatalogueQuery` returns `page: Infinity`, and `JSON.stringify` writes `meta.page` as `null`. The response is still well-formed JSON, but it no longer matches the `meta.page` number in the contract.
**Fix:** Reject values outside the safe-integer range in `positiveInteger`:
```ts
const positiveInteger = z.string().regex(POSITIVE_INTEGER).transform(Number)
  .pipe(z.number().int().safe());
```

### IN-02: The `user` image preset is never used

**File:** `src/server/images.ts:12` and `:14`
**Issue:** `PRESET_WIDTH.user` (512 px) and the `'user'` member of `ImagePreset` have no caller in this phase. The only call sites are `normalize(..., 'tour')` in `src/server/modules/tours/service.ts:663` and `:667`.
**Fix:** Remove the preset until the avatar upload in a later phase needs it, or leave it with a comment that names that phase.

### IN-03: Every seed user has an `example.com` address

**File:** `seed/data/users.json:5-138`
**Issue:** `CLAUDE.md` requires real seed content with no placeholder text anywhere a person might see. `example.com` is a reserved domain, so it is safe to send to, but it is a placeholder. The addresses are not shown on public pages (`toPublicUser` has no email), but the admin screens in later phases will show them.
**Fix:** Use realistic, non-reserved addresses in the seed, or record in an ADR that the reserved domain is intentional.

### IN-04: The reset comment understates what `--reset` deletes

**File:** `scripts/seed/run.ts:168` (comment) and `:169-175` (code)
**Issue:** The comment says "Reset deletes every seed document". The code calls `deleteMany({})` on the four collections, so developer-created users, tours, reviews and bookings are deleted too. `docs/adr/0030` accepts this, so the behaviour is intended, but the comment does not say so.
**Fix:** Change the comment to state that every document in the four collections is removed, and point to ADR 0030.

### IN-05: `npm run seed` is allowed in staging but cannot succeed there yet

**File:** `scripts/seed/run.ts:27-32` (SEED_APP_ENVS) and `:106` (`getDeps()` in `uploadPhotos`); `src/server/deps.ts:48-50`
**Issue:** `assertSeedAllowed` accepts `staging`. `uploadPhotos` then reads `getDeps().storage`, which `productionLikeDeps` makes throw "No real storage adapter is configured yet (Phase 8)". A staging seed therefore connects, syncs indexes and fails at the photo step every time. `docs/adr/0030` says the seed runs in staging.
**Fix:** Until the Phase 8 storage adapter exists, refuse `staging` in `assertSeedAllowed` with a message that says so, or document that the staging seed is blocked.

### IN-06: GitHub Actions are pinned to major tags, not commit SHAs

**File:** `.github/workflows/ci.yml:19`, `:20`, `:50`, `:51`, `:122`
**Issue:** `actions/checkout@v7`, `actions/setup-node@v7` and `actions/upload-artifact@v7` are mutable tags. The quick-depth unpinned check (`main`, `master`, `latest`) does not match them, but a retagged release would run unreviewed code in a job that has `contents: read`.
**Fix:** Pin each action to its full commit SHA with the tag in a trailing comment, for example `uses: actions/checkout@<40-char-sha> # v7`.

---

_Reviewed: 2026-11-16T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
