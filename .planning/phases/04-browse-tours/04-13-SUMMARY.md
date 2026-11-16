---
phase: 04-browse-tours
plan: 13
subsystem: api
tags: [uploads, multipart, sharp, webp, storage, rate-limit, credits, withApi]

requires:
  - phase: 04-browse-tours
    provides: tour writes (plan 04-12), the tour model with imageCover, images and photoCredits (plan 04-01), and the storage adapter with the disk and /media route (ADR 0029)
provides:
  - PUT /api/v1/tours/[id]/images: any subset of a tour's photos, replaced by position, each with its credit
  - withApi `upload` option with byte-counted multipart bodies, and a 1 MB limit on JSON bodies (SEC-17)
  - images.normalize (magic bytes, 5 MB, pixel limit, sharp re-encode to WebP) and randomImageKey
  - ADR 0038, which amends ADR 0017
affects: [phase-05-redis-rate-limit, phase-06-bookings, phase-08-s3-storage]

# Actuals (#2632): chars/4 over the diff of this plan's commits, excluding the lockfile and .planning.
actuals:
  tokens: 22263
  tasks: 3
  commits: 7
# Measured against the base the plan started from (#3968): git rev-list --count base..HEAD.
plan_head_before: a58bd0583195060d0a8e98f93528e61eb6ea7c1e
plan_head_after: 4e29186

tech-stack:
  added: [sharp@0.35.5 (direct dependency; already in the lockfile through Next)]
  patterns:
    - "withApi upload option: multipart only, byte-counted before parsing, access checked before any body is read"
    - "Replace by position: file n replaces gallery slot n, a slot past the end is appended, credits rebuilt per final key"
    - "Credits rebuilt from the final cover and gallery, so each key has exactly one credit (U27)"

key-files:
  created:
    - src/server/api/body.ts
    - src/server/images.ts
    - src/app/api/v1/tours/[id]/images/route.ts
    - test/server/api/body.test.ts
    - test/server/images.test.ts
    - test/app/api/tours-images.test.ts
    - test/helpers/images.ts
    - docs/adr/0038-uploads-multipart-limits-and-image-slots.md
  modified:
    - package.json
    - package-lock.json
    - src/server/api/with-api.ts
    - src/server/modules/tours/schemas.ts
    - src/server/modules/tours/service.ts
    - src/lib/messages.ts
    - test/server/api/with-api.test.ts
    - test/app/api/tours-write.test.ts
    - docs/adr/0017-required-access-and-error-mapping.md
    - docs/adr/README.md
    - docs/contracts.md
    - docs/openapi/openapi.yaml
    - .planning/REQUIREMENTS.md

key-decisions:
  - "D-14 as settled: replace by position, credits per file. A gallery file n replaces slot n; a slot past the current end is appended."
  - "Magic bytes decide the type, never the declared type. sharp re-encodes to WebP, at most 2000 px wide, EXIF rotated, metadata stripped."
  - "Limits: 5 MB per file, 21 MB per request, 1 MB per JSON body, 40,000,000 input pixels. Rate limit 20 uploads per signed-in user per hour (SEC-05)."
  - "Access is checked before the body is read, so an anonymous 30 MB upload is 401, not 413 (SEC-17)."
  - "Replaced keys are deleted only after the new state is saved. A failed delete is logged and the request still answers 200."
  - "Keys this request stored are deleted when a failure happens before the save, so a failed upload leaves no unreferenced file."

patterns-established:
  - "Upload routes declare `upload: { maxBytes }` and read `form` from the context; they never parse the body themselves"
  - "Every refusal of an upload is a 400, 413 or 415 with the standard error body"

requirements-completed: [S16, B4, F6, U27]

coverage:
  - id: D1
    description: "A lead guide or admin uploads a cover: it is checked, re-encoded to WebP, stored under a random key and credited"
    requirement: "S16"
    verification:
      - kind: integration
        ref: "test/app/api/tours-images.test.ts#an admin uploads a seed photo as the cover, re-encoded and credited under a new key"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gallery files replace their slots by position, append past the end, and keep every other photo and credit (B4, U27)"
    requirement: "B4"
    verification:
      - kind: integration
        ref: "test/app/api/tours-images.test.ts#gallery slots by position (B4, U27, D-14)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Oversize, wrong-type, pixel-bomb, missing-credit, count and unknown-part uploads are refused with 413, 415 or 400 in the standard body"
    requirement: "S16"
    verification:
      - kind: unit
        ref: "test/server/images.test.ts#normalize (S16)"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-images.test.ts#limits and rejections (S16, SEC-05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Byte-counted reading: a declared length over the limit is refused before reading, a streamed body is cut off past it, and a JSON body over 1 MB is 413"
    requirement: "S16"
    verification:
      - kind: unit
        ref: "test/server/api/body.test.ts#readBodyLimited (S16, SEC-17)"
        status: pass
      - kind: integration
        ref: "test/app/api/tours-write.test.ts#a JSON body above 1 MB is 413 before it is parsed (SEC-17)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The 21st upload by one user within the hour is 429 with retry-after, and another user is not held back"
    requirement: "S16"
    verification:
      - kind: integration
        ref: "test/app/api/tours-images.test.ts#the 21st upload by one user within the hour is 429 with a retry-after"
        status: pass
    human_judgment: false
  - id: D6
    description: "A cover added to a tour with none appears in the catalogue list and by its slug (D-13)"
    requirement: "F6"
    verification:
      - kind: integration
        ref: "test/app/api/tours-images.test.ts#a cover added to a tour with none appears in the catalogue list and by its slug"
        status: pass
    human_judgment: false
  - id: D7
    description: "The approved wording for an extra credit and for an unknown part, which use the unrecognised-field message until the user approves wording of their own"
    verification: []
    human_judgment: true
    rationale: "copy.md has no approved wording for an extra credit or an unknown multipart part. The plan's copy list does not cover either case, so the user must approve the text."

# Metrics
duration: ~30min (estimated; start time not recorded)
completed: 2026-11-16
status: complete
---

# Phase 4 Plan 13: Tour image uploads with byte limits and replace-by-position Summary

**Multipart tour photo uploads: sharp re-encodes each file to WebP after a magic-byte check, a 21 MB byte-counted limit applies, gallery slots are replaced by position with their credits, and uploads are limited to 20 per user per hour**

## Performance

- **Duration:** about 30 min (estimated; the start time was not recorded). The code commits run from 21:44 to 21:59 IST.
- **Started:** not recorded
- **Completed:** 2026-11-16
- **Tasks:** 3 of 3
- **Files modified:** 21 (13 listed as modified, 8 created, counting the lockfile and the ADR index)

## Accomplishments

- `PUT /api/v1/tours/[id]/images` accepts any subset of `imageCover` (0 or 1 file), `images` (0 to 3 files) and a JSON `credits` part, and answers the tour with its guides.
- Each file is judged by its bytes. A file over 5 MB is 413; a file that is not JPEG, PNG or WebP, or that sharp cannot decode, is 415; an image over 40,000,000 pixels is 413.
- Stored photos are WebP at most 2000 px wide, EXIF-rotated and stripped of metadata, under `tours/<uuid>.webp`, and each carries its credit.
- `withApi` gained an `upload` option: multipart only, byte-counted before parsing, and access checked first. JSON bodies are limited to 1 MB.
- Gallery files replace their slots by position and append past the end. The other slots keep their photos and credits, and every key ends with exactly one credit (U27).
- Uploads are limited to 20 per signed-in user per hour, and the 21st answers 429 with `retry-after` (SEC-05).
- ADR 0038 records the contract and amends ADR 0017. The OpenAPI spec and the contracts are updated.

## Task Commits

Each task was committed atomically. Tasks 2 and 3 are TDD tasks, so their RED and GREEN commits are separate:

1. **Dependency: sharp 0.35.5 as a direct dependency** - `28f8e00` (chore, with the one-line reason in the body)
2. **Task 1: Upload a tour cover, re-encoded and credited** - `034162f` (feat)
3. **Task 2 RED: failing tests for upload rejections and the per-user limit** - `cdf5196` (test)
4. **Task 2 GREEN: refuse unknown parts, more than three gallery photos and a 21st upload** - `01d8bab` (feat)
5. **Task 3 RED: failing tests for gallery slots by position and their credits** - `2464561` (test)
6. **Task 3 GREEN: replace gallery photos by position, each with its credit** - `3fcee29` (feat)
7. **Task 3 docs: ADR 0038, the contracts and the OpenAPI path** - `4e29186` (docs)

**Plan metadata:** recorded in the final commit of this plan (docs, with SUMMARY.md and REQUIREMENTS.md).

## Files Created/Modified

- `src/server/api/body.ts` - `readBodyLimited` (declared-length check, streamed count, stop past the limit) and `parseMultipart`
- `src/server/images.ts` - `normalize(bytes, preset)` (5 MB, magic bytes, sharp re-encode, pixel limit) and `randomImageKey(prefix)`
- `src/server/api/with-api.ts` - `upload` option, `form` in the context, JSON limit, `rateLimit.key` receives `user`
- `src/server/modules/tours/schemas.ts` - `parseImagesForm`, the credit schemas and the `ImagesInput` type
- `src/server/modules/tours/service.ts` - `replaceImages(id, input)` and the removal helper, which now takes its log message
- `src/app/api/v1/tours/[id]/images/route.ts` - `PUT`, with `roles: ['lead-guide', 'admin']`, the upload limit and the rate limit
- `src/lib/messages.ts` - the approved copy for the tour image rejections
- `test/server/api/body.test.ts`, `test/server/images.test.ts`, `test/app/api/tours-images.test.ts`, `test/helpers/images.ts` - new tests and helpers
- `test/server/api/with-api.test.ts`, `test/app/api/tours-write.test.ts` - upload and JSON limit tests
- `docs/adr/0038-uploads-multipart-limits-and-image-slots.md` - new ADR
- `docs/adr/0017-required-access-and-error-mapping.md`, `docs/adr/README.md` - amendment and index row
- `docs/contracts.md`, `docs/openapi/openapi.yaml` - withApi upload contract, tour image contract and the PUT path
- `.planning/REQUIREMENTS.md` - S16, B4, F6 and U27 marked complete through `requirements.mark-complete`

## Decisions Made

- D-14 is implemented as settled: replace by position, with credits per file.
- Magic bytes decide the type, and the declared type is never consulted.
- Access is checked before the body is read, so an anonymous upload of any size is 401.
- The rate limit is keyed by user id. It is a fixed window of 20 per hour, from the existing limiter adapter.
- Staging and production answer 500 on this route until Phase 5 adds Redis (ADR 0016). That is the intended failure mode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stop reading at the limit by releasing the reader, not cancelling the stream**
- **Found during:** Task 2 (the RED run of the 413 multipart test)
- **Issue:** `reader.cancel()` on a body built from `FormData` raised an unhandled rejection inside undici on Node 24 ("ReadableStream is already closed"). That failed the whole vitest run. Reproduced in isolation: `cancel` triggers it, and `releaseLock` does not.
- **Fix:** `readBodyLimited` calls `reader.releaseLock()` at the limit and then throws `PAYLOAD_TOO_LARGE`. No more bytes are read. The plan task text says "cancels the stream", so this departs from that wording, but the behaviour is the same and it is recorded in ADR 0038.
- **Files modified:** `src/server/api/body.ts`, `test/server/api/body.test.ts` (the counted stream no longer expects a cancel)
- **Verification:** full suite passes (95 files, 1,184 tests) with no unhandled errors.
- **Committed in:** `01d8bab`

**2. [Rule 2 - Missing critical] Remove what a request stored when it fails before the save**
- **Found during:** Task 3 (reviewing `replaceImages`)
- **Issue:** The plan removes stored keys only when `save()` fails. A storage `put` that fails partway through would leave the earlier keys in storage, unreferenced.
- **Fix:** the try block covers every store and the save, and a failure removes what the request stored.
- **Files modified:** `src/server/modules/tours/service.ts`
- **Verification:** the gallery and cover tests pass; the removal path is covered by the save-failure branch.
- **Committed in:** `3fcee29`

**3. [Rule 2 - Missing critical] The service repeats the credit check**
- **Found during:** Task 3
- **Issue:** `parseImagesForm` enforces one credit per file, but `replaceImages` is exported and could be called with a file and no credit, which would store an uncredited photo (U27).
- **Fix:** `replaceImages` refuses a cover or gallery file with no credit (`creditMissing`).
- **Files modified:** `src/server/modules/tours/service.ts`
- **Committed in:** `3fcee29`

**4. [Rule 2 - Consistency] `query: z.strictObject({})` on the images route**
- **Found during:** Task 1
- **Issue:** the plan's route definition has no `query` schema. The PATCH and DELETE routes for tours both declare one, so an unknown query key is a 400 there.
- **Fix:** the images route declares the same empty strict query schema.
- **Committed in:** `034162f`

**Total deviations:** 4 auto-fixed (1 bug, 3 missing critical or consistency). The first is a runtime fix, and the rest close gaps in the plan's wording. **Impact on plan:** no scope creep. Every behaviour the plan asks for is implemented and tested.

## TDD Gate Compliance

Tasks 2 and 3 are `tdd="true"`. Their RED commits come before their GREEN commits:

- Task 2: RED `cdf5196`, GREEN `01d8bab`. Three intended failures at RED: four gallery files answered 200 instead of 400; an unknown part answered 200 instead of 400; the 21st upload answered 200 instead of 429. These were checked by reading the assertion messages.
- Task 3: RED `2464561`, GREEN `3fcee29`. Five gallery tests failed at RED for the intended reasons: the slot was not replaced, the append did not happen, and the storage delete was never called. The catalogue test already passed, which is expected because Task 1 delivered the cover path.

Honest limits of the discipline:

- The size, type, credit and order tests in Task 2 were written after the Task 1 code that enforces them, because the plan orders Task 1 first. They characterise existing behaviour rather than driving it. Only the three RED failures above were driven by new code.
- The machine RED classifier (`gsd_run check tdd-red-evidence`) was not run. The plan is `type: execute`, not `type: tdd`, so the classifier record was not produced, and the RED evidence above is the assertion inspection only.

## Issues Encountered

- A fresh worktree has no generated Next types or `next-env.d.ts`, so `tsc` reported three errors that have nothing to do with this plan. `npx next typegen` generated them (both are gitignored), and `tsc --noEmit` is clean after that.
- `useTestDatabase()` was called twice in one file, which caused `MongoNotConnectedError`. The helper says to call it once per file, so the file now has one parent `describe`.
- ESLint `rules-of-hooks` rejects a top-level `useTestDatabase()` call, so the call sits inside the parent `describe`.
- **Coverage gate, pre-existing and not fixed here:** `npm run test:coverage` exits 1 because `src/server/modules/users/service.ts` is at 77.77% lines against the 85% per-file threshold. That file is unchanged since the base commit, and the gap is already logged as open in `.planning/phases/04-browse-tours/deferred-items.md` from plan 04-12. This plan's new and changed files are above their thresholds: `images.ts` 100% lines, `with-api.ts` 100%, `service.ts` 91.66% for the module's new paths.
- **D2 is not marked complete.** Its text requires object storage. Uploads go through the storage adapter, but in this phase that is the disk adapter. The S3 adapter is Phase 8, so the requirement is only partly met.
- **Copy gap:** an extra credit and an unknown multipart part use the existing unrecognised-field message, because no approved wording exists for either. This is flagged in ADR 0038 and in the copy item of the requirements.

## Verification run on the final code

- `npx vitest run`: 95 files, 1,184 tests passed (run before the docs commit; the docs commit changes no test).
- `npx tsc --noEmit`: clean (after `npx next typegen`).
- `npx eslint . --max-warnings=0`: clean.
- `npx prettier --check .`: clean.
- `npx knip`: clean (two schema exports that were only used internally were un-exported).
- `npm run build`: exit 0; `/api/v1/tours/[id]/images` is listed as dynamic.
- `npm run check:conventions` and `npm run check:client`: pass.
- `npm run test:coverage`: fails only on the pre-existing users service gate described above.
- `docs/openapi/openapi.yaml` parses; `/tours/{id}/images` has all ten documented responses.

## User Setup Required

None - no external service configuration required. The phase still needs the Phase 5 Redis rate limiter before uploads work outside development and CI (ADR 0016).

## Next Phase Readiness

- The images endpoint is complete for Phase 4. The `/credits` page and the tour page read the photos and credits this endpoint writes.
- Phase 5 must add the Redis rate limiter, which the upload route's `tour-images` rule depends on.
- Phase 8 must add the S3 storage adapter for D2, and the `/media` route will then need an object-storage path.
- Open items: the users service coverage gate (`deferred-items.md`), and the approved copy for an extra credit and an unknown part (ADR 0038).

## Self-Check: PASSED

- Created files exist on disk: `src/server/api/body.ts`, `src/server/images.ts`, `src/app/api/v1/tours/[id]/images/route.ts`, `test/server/api/body.test.ts`, `test/server/images.test.ts`, `test/app/api/tours-images.test.ts`, `test/helpers/images.ts`, `docs/adr/0038-uploads-multipart-limits-and-image-slots.md`.
- Commits are on the branch: `28f8e00`, `034162f`, `cdf5196`, `01d8bab`, `2464561`, `3fcee29`, `4e29186`. Seven commits in total since the base `a58bd05`.
- STATE.md and ROADMAP.md were not modified, as the orchestrator requires.

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
