# Phase 4: Browse tours - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 46 new or modified (grouped below)
**Analogs found:** 38 / 46 (all analog paths verified git-tracked via `git ls-files`)

Phases 1 to 3 left a complete pipeline (`withApi`, `parseQuery`, `getDeps`, DTOs, 27 `ui/` components). Phase 4 has **no existing service module with caching, no seed script, no Route Handler beyond `healthz`/`readyz`, no client component that loads a library, and no multipart code**. Most new code is therefore "extend an existing interface" rather than "copy a sibling".

## Cross-cutting conventions (read first)

- **Kebab-case file names** under `src/`, `scripts/`, `test/` are enforced by `scripts/check-conventions.ts` (Q3). Applies to every new file, including `[...key]` and `[id]` folder names as already used by Next (check the script allows bracket segments before planning route folders).
- **`import 'server-only'`** is the first line of every server module (`src/server/api/with-api.ts:1`, `src/server/adapters/cache.ts:1`, `src/server/modules/users/service.ts:1`). The seed script runs with `tsx --conditions=react-server` for this reason.
- **Tests:** Vitest under `test/server/**`, `test/app/*.test.ts`, `test/scripts/**`; Playwright is `test/app/**/*.spec.ts` only (`vitest.config.mts:26-27`, `playwright.config.ts:28-33`). Service tests call `useTestDatabase()` (`test/helpers/db.ts:21-32`) and the factories in `test/helpers/factories.ts`.
- **No `loading.tsx` under `src/app/tour/[slug]/`** (RESEARCH Pitfall 1). `/` and `/credits` may have one.

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/server/modules/tours/service.ts` | service | CRUD + cached read | `src/server/modules/users/service.ts` (+ `Cache.cached` in `src/server/adapters/cache.ts`) | role-match |
| `src/server/modules/tours/catalogue-query.ts` | utility (pure) | transform | `src/server/api/parse-query.ts` (pure, Zod) | partial |
| `src/server/modules/tours/schemas.ts` | model (Zod schemas) | request-response | `test/examples/shared-service.test.ts:24` (`z.strictObject`) + `src/server/validation.ts` | partial |
| `src/server/modules/tours/credits.ts` | service | cached read | `src/server/modules/tours/dto.ts` | partial |
| `src/server/modules/tours/dto.ts` (modify: `createdAt`, `alt`, split guides) | model (DTO) | transform | itself (`dto.ts:41-138`) | exact |
| `src/server/modules/tours/model.ts` (modify: optional `imageCover`, `alt`) | model | CRUD | itself (`model.ts:20-62`, `:194`, `:202`) | exact |
| `src/server/modules/reviews/service.ts` | service | CRUD | `users/service.ts` + `reviews/dto.ts` | role-match |
| `src/server/modules/bookings/service.ts` | service | CRUD | `users/service.ts` | role-match |
| `src/server/adapters/cache.ts` + `real-cache.ts` (modify: `{ revalidate }`) | config/adapter | cached read | themselves | exact |
| `src/server/adapters/storage.ts` (modify: `get`, `urlFor`) | adapter | file-I/O | itself (`storage.ts:5-35`) | exact |
| `src/server/adapters/local-disk-storage.ts` | adapter | file-I/O | `createFakeStorage` in `storage.ts:18-35` | role-match |
| `src/server/deps.ts` (modify) | config | request-response | itself (`deps.ts:33-63`) | exact |
| `src/server/api/body.ts` + `with-api.ts` (modify: byte-counted body, `upload`) | middleware | request-response / streaming | `with-api.ts:67-81` `readBody` | exact |
| `src/server/api/responses.ts` (modify: `list` key) | utility | request-response | itself (`responses.ts:28-30`) | exact |
| `src/server/images.ts` | utility | transform (file-I/O) | none | no analog |
| `src/app/media/[...key]/route.ts` | route | file-I/O, request-response | `src/app/healthz/route.ts` | role-match |
| `src/app/api/v1/tours/**/route.ts` (11 handlers) | route | request-response | `test/examples/shared-service.test.ts:26-31` + `healthz/route.ts` | role-match |
| `src/app/page.tsx` (replace) | page | request-response | `src/app/page.tsx` (placeholder) + `test/examples/page-data.test.ts:21-25` | partial |
| `src/app/tour/[slug]/page.tsx` | page | request-response, streaming | `test/examples/page-data.test.ts:21-25` (`notFound`) | partial |
| `src/app/credits/page.tsx` | page | request-response | `src/app/styleguide/page.tsx` | partial |
| `src/app/sitemap.ts`, `robots.ts` | route (metadata) | request-response | `src/app/readyz/route.ts` (dynamic route) | partial |
| `src/app/layout.tsx` (modify: `generateMetadata`) | provider | request-response | itself (`layout.tsx:11-13`) | exact |
| `src/components/features/tour-filters.tsx` | component | request-response (GET form) | `src/components/ui/select.tsx` | role-match |
| `src/components/features/route-map-slot.tsx`, `route-map.tsx` | component (client) | event-driven | `src/components/ui/map-frame.tsx` + `mobile-menu.tsx` (client) | partial |
| `src/components/features/booking-section.tsx`, `guides-section.tsx`, `reviews-section.tsx` | component | request-response | `src/components/ui/booking-panel.tsx`, `guide-item.tsx`, `review-item.tsx` | role-match |
| `src/components/features/tour-gallery.tsx`, `credits-group.tsx` | component | transform | `src/components/ui/photo-credits.tsx`, `tour-row.tsx` | role-match |
| `src/lib/route-projection.ts` (extract) | utility | transform | `map-frame.tsx:23-48` `project` | exact (extract) |
| `src/lib/format.ts` (add `formatMonth`) | utility | transform | `format.ts:46` `formatDate` | exact |
| `scripts/seed.ts`, `scripts/seed/*.ts` | script | batch | `scripts/ci-mongo.ts` (guarded `main`) | role-match |
| `test/server/modules/tours/service.test.ts` etc. | test | CRUD | `test/server/modules/users/service.test.ts` | exact |
| `test/server/api/tours-*.test.ts` | test | request-response | `test/examples/shared-service.test.ts` + `test/helpers/call-route.ts` | exact |
| `test/scripts/seed.test.ts` | test | batch | `test/scripts/ci-mongo.test.ts` | exact |
| `test/app/*.spec.ts` (Playwright: no-JS, map lazy-load) | test | e2e | `test/app/map-frame.spec.ts`, `test/app/booking-panel.spec.ts` | exact |
| `scripts/smoke.ts` (modify: 404 check) | script | request-response | itself | exact |
| `next.config.ts` (modify: `images.localPatterns`) | config | n/a | itself (`next.config.ts:3-31`) | exact |

## Pattern Assignments

### `src/server/modules/tours/service.ts` (service, cached read + CRUD)

**Analog:** `src/server/modules/users/service.ts` (structure, db-down mapping) and `src/server/adapters/cache.ts` (the `cached` contract).

**Imports and db-down mapping** (`users/service.ts:1-30`):
```typescript
import 'server-only';
import { Types } from 'mongoose';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { AppError } from '@/server/errors';
import { User, type UserRecord } from './model';

export async function findActiveById(id: string): Promise<UserRecord | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDb();
  try {
    return await User.findOne({ _id: id, active: { $ne: false } })
      .select('-__v')
      .lean<UserRecord>();
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}
```
Copy: `connectDb()` first, `Types.ObjectId.isValid` guard returning null (malformed id is "not found", contracts 2.3), `.lean()`, and the same try/catch wrapping `isDbUnavailableError` into `SERVICE_UNAVAILABLE`. Factor the catch into one helper in the tours service rather than repeating it.

**Cache contract** (`adapters/cache.ts:7-14`) and how to reach it (`deps.ts:66-74`):
```typescript
export interface Cache {
  cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, keyParts: string[], tags: string[]): (...args: A) => Promise<R>;
  invalidate(...tags: string[]): Promise<void>;
}
// usage: getDeps().cache.cached(loadCatalogue, ['catalogue'], ['tours'])()
```
Phase 4 adds an optional 4th arg `{ revalidate?: number }` (see Cache modify entry). Cached functions must return DTOs (`toTourSummary` from `dto.ts:71`), never documents, since `unstable_cache` JSON-serialises.

**Invalidate after write** (`real-cache.ts:14-19`): `await getDeps().cache.invalidate('tours', \`tour:${id}\`)` after the awaited `save()`. Tests assert `fakes.cache.invalidated` (the fake records tags: `cache.ts:19-30`; `test/helpers/fakes.ts:23`).

**Update rule:** load, `doc.set(...)`, `await doc.save()` (QA-04); do not use `findByIdAndUpdate`.

---

### `src/server/modules/tours/dto.ts` (modify)

**Analog:** itself. Edit points:
- `SummarySource`/`TourSummary` (`dto.ts:8-59`): add `createdAt` (cached catalogue needs it for `-createdAt` sort, Pitfall 11) and keep `imageCover: string` (tours without a cover are filtered out of the catalogue before mapping, D-13).
- `toTourDetail` (`dto.ts:112-138`) throws if a guide is unpopulated (`dto.ts:113-117`). Split into `TourDetail` (no `guides`) plus a `toGuides` helper that skips null/deactivated guides, per RESEARCH Pattern 6. Keep `isGuideRecord` (`dto.ts:97-106`) as the null-before-`in` check.
- `photoCredits.map` (`dto.ts:129-136`): add `alt` once the model has it (D-15).
- Existing test to extend: `test/server/modules/tours/dto.test.ts`.

---

### `src/server/adapters/storage.ts` and `src/server/adapters/local-disk-storage.ts` (adapter, file-I/O)

**Analog:** `createFakeStorage` (`storage.ts:18-35`) for shape, `FakeStorage`/`StoredFile` types (`storage.ts:11-16`).

```typescript
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}
// fake today: urlFor => `${getConfig().appOrigin}/storage/${encodeURIComponent(key)}`
```
Changes: add `get(key): Promise<StoredFile | null>` (reuse the existing `StoredFile` type); change `urlFor` to return `/media/${key}` in all adapters (root-relative so `next/image` treats it as local). The disk adapter implements the same interface, confines keys to `STORAGE_DIR`, and is selected in `deps.ts` `fakeDeps` for `development` and `ci` while `test` keeps `createFakeStorage()` (`deps.ts:54-63` builds from `appEnv`; the cache line `appEnv === 'test' ? createFakeCache() : createNextCache()` at `deps.ts:61` is the exact pattern to copy for choosing per `APP_ENV`). `productionLikeDeps` storage getter (`deps.ts:47-49`) keeps throwing until Phase 8. Update `test/server/adapters/fakes.test.ts` and `test/server/deps.test.ts`.

---

### `src/server/api/with-api.ts` + `src/server/api/body.ts` (middleware, byte-counted body)

**Analog:** `with-api.ts` itself.

**Current body reader to generalise** (`with-api.ts:55,67-81`):
```typescript
const JSON_CONTENT_TYPE = /^application\/json\s*(;|$)/i;
async function readBody(request: NextRequest, schema: z.ZodType): Promise<unknown> {
  if (!JSON_CONTENT_TYPE.test(request.headers.get('content-type') ?? '')) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE');
  }
  let raw: unknown;
  try { raw = await request.json(); }
  catch { throw new AppError('VALIDATION_ERROR', messages.validation.invalidJson); }
  return schema.parse(raw);
}
```
**Pipeline order to preserve** (`with-api.ts:137-170`): Origin check on writes, `resolveAccess`, params, query, body, rate limit, handler. Add an `upload` option to `ApiOptions` (`with-api.ts:21-35`); keep body parsing after access so an anonymous caller never makes the server buffer 21 MB. Use `AppError('PAYLOAD_TOO_LARGE')` (confirm the code exists in `src/server/errors.ts` before planning). Existing tests to extend: `test/server/api/with-api.test.ts`.

---

### `src/app/api/v1/tours/**/route.ts` (route, request-response)

**Analogs:** `src/app/healthz/route.ts` (file shape) and the route in `test/examples/shared-service.test.ts` (query schema plus service call).

**File shape** (`healthz/route.ts:1-11`):
```typescript
import { withApi } from '@/server/api/with-api';
export const GET = withApi(
  async () => Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } }),
  { access: 'public' },
);
```
**Query plus service** (`shared-service.test.ts:24-31`):
```typescript
const inputSchema = z.strictObject({ id: z.string() });
const route = {
  GET: withApi(async ({ query }) => ok(await showProfile(query.id)), { access: 'auth', query: inputSchema }),
};
```
Rules: import `z` only from `@/server/validation` (ADR 0009); responses only through `ok`, `created`, `list`, `noContent` (`responses.ts:18-35`); `list` currently emits `data: unknown[]` (`responses.ts:28-30`) and must change to `data: { tours: [...] }` (Open Question 6; update `docs/contracts.md` 2.1 and `test/server/api/responses.test.ts`); role access is `{ roles: [...] }` objects (see `src/server/access.ts`); route handlers contain no business logic (B13). `[id]` folder naming everywhere.

---

### `src/app/media/[...key]/route.ts` (route, file-I/O)

**Analog:** `healthz/route.ts` shape with `access: 'public'`. Return `new Response(body, { headers: { 'content-type', 'cache-control': 'public, max-age=86400' } })` from `getDeps().storage.get(key)`; missing key is `throw new AppError('NOT_FOUND')` (mapped by `withApi`'s catch, `with-api.ts:182-208`). `params` arrives as `Promise<Record<string, string | string[]>>` (`with-api.ts:51`), so a catch-all gives `string[]`; validate with a Zod schema passed as `params`. Test with `callRoute(route, { path, params })` (`test/helpers/call-route.ts:51-95`).

---

### `src/app/page.tsx` (page, request-response) and list components

**Analogs:** current `src/app/page.tsx` (to replace), `src/components/ui/tour-row.tsx`, `pagination.tsx`, `select.tsx`, `empty-state.tsx`, and `src/server/api/parse-query.ts`.

**Lenient query parse** (`parse-query.ts:44-65`): a field failing its schema falls back to default; unknown keys dropped. Page code:
```typescript
const search = await props.searchParams;           // a Promise in this Next version
const query = parseQuery(listQuerySchema, search); // defaults in the schema: sort '-ratingsAverage', page 1, limit 12
```
**TourRow props** (`tour-row.tsx:8-17`): `name, location, photoUrl, lengthDays, difficulty, startDate (string|Date), priceRupees, href`. Map from `TourSummary`: `location = startLocation.description`, `photoUrl = storage.urlFor(imageCover)` (root-relative `/media/...`), `startDate = startDates` first bookable (computed from `now()` per request, never cached), `priceRupees = price`. `TourRow` renders an `<li>` so the page supplies the `<ul>`. Its `sizes="(min-width: 64em) 10rem, 7rem"` is already set (`tour-row.tsx:42`); first visible row uses `preload`, not `priority` (RESEARCH U7).

**Pagination** (`pagination.tsx:4-10`): `{ page, totalPages, previousHref, nextHref, label }`. Hrefs are built from the validated query, omitting defaults. The component already shows disabled spans, so the page renders it only when total exceeds `limit` (U10: above 12).

**Filter form** (`features/tour-filters.tsx`): a native `<details>` containing `<form method="get" action="/">` with `Select` (`select.tsx:5-25`; props `label, name, options: {value,label}[]`, spreads `...rest` onto the `<select>` so `defaultValue` works) plus the `Button`. No client JS (D-05). Option labels for price go through `formatPrice`; month labels through new `formatMonth`.

**Empty state:** `EmptyState({ message, action })` (`empty-state.tsx:4-12`).

---

### `src/app/tour/[slug]/page.tsx` (page, streaming)

**Analogs:** `test/examples/page-data.test.ts:20-25` for the `notFound()` data-function shape; `src/server/session.ts:120-135` for React `cache()` usage (`getCurrentUser = cache(async ...)`).

```typescript
// page-data.test.ts:21-25
async function loadGuidePage(id: string) {
  const record = await findActiveById(id);
  if (!record) notFound();
  return { guide: toPublicUser(record) };
}
```
Copy: resolve the tour first with a `cache()`-wrapped `getTourPage(slug)` shared by `generateMetadata` and the page, `notFound()` before any `<Suspense>`. Streaming sections (booking, guides, reviews) are separate async Server Components in `components/features/`; headings sit outside the boundaries. `Skeleton` variants available: `'text' | 'review-item' | 'guide-item' | 'booking-panel'` (`skeleton.tsx:3-22`).

**Component props to map to** (all verified):
- `FactsStrip { difficulty, lengthDays, groupSize, location, rating }` (`facts-strip.tsx:5-12`)
- `BookingPanelProps` = union of `bookable | logged-out | booked | no-dates` (`booking-panel.tsx:8-32`); `logged-out` needs `tourHref`; dates are `YYYY-MM-DD` strings
- `Itinerary { days: { day, summary }[] }` (`itinerary.tsx:3`)
- `MapFrame { locations: { day, lat, lng }[] }` (`map-frame.tsx:3-5`)
- `GuideItem { name, photoUrl?, role }` (`guide-item.tsx:4`)
- `ReviewItem { authorName, authorPhotoUrl?, rating, comment, createdAt }` renders an `<li>` (`review-item.tsx:8-25`)
- `PhotoCredits { credits: { authorName, authorUrl, licenceName, licenceUrl }[] }` (`photo-credits.tsx:4-11`); note it keys `<li>` by `authorUrl`, which is not unique when one author has several photos on one tour: verify and fix the key in the same plan if the seed has such a tour (`photo-credits.tsx:17`).

**Booking state** (never cached): `getCurrentUser()` from `src/server/session.ts:120` (React-`cache`d per request), then `bookings.findUpcomingPaid(userId, tourId)`; `isBookable(date, now)` / `tripStatus` from `src/lib/ist.ts:54,59`.

---

### `src/components/features/route-map-slot.tsx` and `route-map.tsx` (client, event-driven)

**Analog:** `src/components/ui/map-frame.tsx` for geometry and `mobile-menu.tsx` for the `// client:` reason comment and client boundary convention (`scripts/check-client-boundaries.ts` enforces it; read it before writing the client files).

**Projection to extract into `src/lib/route-projection.ts`** (`map-frame.tsx:23-48`):
```typescript
const meanLat = stops.reduce((sum, stop) => sum + stop.lat, 0) / stops.length;
const cos = Math.cos((meanLat * Math.PI) / 180);
const toPlanar = (stop: RouteStop) => ({ x: stop.lng * cos, y: -stop.lat });
```
`MapFrame` and the Leaflet component must both import this (RESEARCH Pitfall 14); add a unit test that both get identical planar coordinates. Constants `WIDTH=400, HEIGHT=240, PADDING=28` (`map-frame.tsx:8-10`) define the slot aspect so nothing jumps. `RouteMapSlot` renders the server `MapFrame` as `children` until `IntersectionObserver` fires, then `next/dynamic(..., { ssr: false })`. No Leaflet analog exists; follow RESEARCH Pattern 8.

---

### `scripts/seed.ts` and `scripts/seed/*.ts` (script, batch)

**Analog:** `scripts/ci-mongo.ts`.

**Guarded entry** (`ci-mongo.ts:45-53`) so Vitest can import the exports without running `main`:
```typescript
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`ci-mongo: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
```
**Pure-helper-plus-main shape** (`ci-mongo.ts:14-26`): `parseMongoOptions(env)` is exported, takes `env` as a parameter, and throws a plain `Error` with a clear message. Copy for `parseSeedArgs(argv, env)`.

**Data sources:** `test/helpers/seed.ts:5-77` already reads `seed/data/*.json` with `readFileSync` and defines `SeedTour`/`SeedUser`/`SeedReview`/`SeedBooking` types. The seed loader should live in `scripts/seed/load.ts` and either import or independently mirror those types (scripts may not import from `test/`; do not import `test/helpers`). Note `SeedTour` there has bare file names; the loader adds the `tours/` prefix (RESEARCH Pattern 4; `createTour` in `test/helpers/factories.ts:161` needs the same prefix).

**Must not call** any service that calls `cached` or `invalidate`; use models plus `getDeps().storage` directly (ARC-03). Test: `test/scripts/seed.test.ts`, modelled on `test/scripts/ci-mongo.test.ts` plus `useTestDatabase()`.

---

### `src/server/modules/reviews/service.ts`, `bookings/service.ts` (service, CRUD)

**Analog:** `users/service.ts` (above) and `reviews/dto.ts`.

`toReview` requires `user` populated (`reviews/dto.ts:45-`), and its `isAuthorRecord` (`:26-35`) is null-safe. The service populates `user` with `select: 'name photo role'` only, skips (and logs via `src/server/logger.ts`) a review whose author is null, and sorts newest first. Cache the whole review list per tour (`['reviews', tourId]`, tag `reviews:${tourId}`), page in memory.

---

### `src/app/layout.tsx` (modify)

**Analog:** itself. Replace `export const metadata` (`layout.tsx:11-13`) with:
```typescript
export async function generateMetadata(): Promise<Metadata> {
  return { metadataBase: new URL(getConfig().appOrigin), title: { default: 'Natours', template: '%s | Natours' } };
}
```
`getConfig` from `@/server/config` (used the same way in `test/helpers/call-route.ts:2,58`). Never at module scope.

---

### `src/app/sitemap.ts`, `src/app/robots.ts`

**Analog:** `src/app/readyz/route.ts` for a dynamic server file (read it for the pattern). Both must `export const dynamic = 'force-dynamic'`. Origin from `getConfig().appOrigin` only.

---

### Tests

- **Service tests:** copy `test/server/modules/users/service.test.ts:1-40` (`useTestDatabase()`, `createUser`, direct model writes via `Model.collection.updateOne`, `vi.restoreAllMocks`). Use `createTour`, `createReview`, `createBooking` from `test/helpers/factories.ts:161,185,218`.
- **Route tests:** `callRoute(route, { path, params, as, body })` (`test/helpers/call-route.ts:51`); an object body is sent as JSON, a `FormData` body as multipart (upload tests); `as` signs a session cookie. Anonymous: omit `as`. Combine with `mockSession` (`test/helpers/mock-session.ts`) when a page data function reads the session.
- **Cache assertions:** `fakes.cache.invalidated` (`test/helpers/fakes.ts`, `adapters/cache.ts:16`); call `resetFakes()` between tests.
- **B13 shared-service proof:** `test/examples/shared-service.test.ts:52-68` shows the page-and-route-return-identical-DTO assertion to copy for list and detail.
- **Playwright specs:** `test/app/map-frame.spec.ts` and `booking-panel.spec.ts` for structure; no-JS behaviour via `test.use({ javaScriptEnabled: false })`.

## Shared Patterns

### Access declaration (every Route Handler)
**Source:** `src/app/healthz/route.ts:10`, `with-api.ts:26`. Always pass `access`: `'public'`, `'auth'`, or `{ roles: [...] }`. A route with none returns 403.

### Error handling
**Source:** `src/server/errors.ts` (`AppError(code, message?, details?)`) and `with-api.ts:182-208`. Services throw `AppError('NOT_FOUND' | 'CONFLICT' | 'SERVICE_UNAVAILABLE' | ...)`; never build error responses by hand. Pages let `AppError` bubble to `src/app/error.tsx` and use `notFound()` for missing records.

### Validation
**Source:** `src/server/validation.ts` (`z`, `issuesToDetails`), `parse-query.ts:44-65`. Pages: `parseQuery` with defaults. API: `z.strictObject` through `withApi` `params`/`query`/`body`.

### DTOs, not documents
**Source:** `tours/dto.ts`, `reviews/dto.ts`, `users/dto.ts` (`toPublicUser`). Anything crossing into a page, a route, or the cache is a DTO.

### Locale formatting
**Source:** `src/lib/format.ts:31,46,65` (`formatPrice`, `formatDate`, `formatDistance`), `src/lib/ist.ts` (`toIstDay`, `fromIstDay`, `addIstDays`, `isBookable`, `tripStatus`, `istMonthBounds`). Add `formatMonth` beside `formatDate`; no hand-typed rupees, dates or months in JSX.

### Adapters via `getDeps()`
**Source:** `src/server/deps.ts:66-74`. Services call `getDeps().cache` and `getDeps().storage`; never import `next/cache` outside `real-cache.ts` (`real-cache.ts:6`).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/server/images.ts` | utility | transform | No image handling or sharp usage exists; follow RESEARCH Pattern 10 |
| Multipart branch in `withApi` | middleware | streaming | Only JSON bodies exist today (`with-api.ts:71-72`); follow RESEARCH Pattern 9 |
| `src/components/features/route-map.tsx` (Leaflet) | component (client) | event-driven | No third-party client library is loaded anywhere; follow RESEARCH Pattern 8 |
| Layered vendor CSS file | config (CSS) | static | `@layer vendor` is new; also edit the layer-order line in `src/styles/reset.css` (RESEARCH: line 6) |
| `public/data/india-soi.geojson` | static data | n/a | One-off `mapshaper` output, human-verify checkpoint |
| Geo and aggregation queries (`$geoNear`, `$group`, `$unwind`) | service | batch | No aggregation exists yet; follow RESEARCH Pattern 9 |
| `src/app/styleguide` sections for new feature components | n/a | n/a | Not required; `styleguide/page.tsx` stays as is (CONTEXT) |

## Metadata

**Analog search scope:** `src/server/**`, `src/app/**`, `src/components/ui/**`, `src/lib/**`, `scripts/**`, `test/**`, `next.config.ts`, `vitest.config.mts`
**Files scanned:** about 150 tracked files listed, 28 read
**Pattern extraction date:** 2026-11-16
**Not read (planner should read before writing a plan touching them):** `scripts/check-conventions.ts` (file-name rules for bracket folders), `scripts/check-client-boundaries.ts` (`// client:` rule), `src/server/access.ts` (exact `{ roles }` shape), `src/server/errors.ts` (is `PAYLOAD_TOO_LARGE` a code?), `src/app/readyz/route.ts`, `src/components/ui/mobile-menu.tsx`, `test/app/map-frame.spec.ts`.
