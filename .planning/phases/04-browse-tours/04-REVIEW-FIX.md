---
phase: 04-browse-tours
fixed_at: 2026-11-16T17:11:43Z
review_path: /Users/rithikagarwal/Desktop/natours-claude/.planning/phases/04-browse-tours/04-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 4
skipped: 2
status: partial
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-11-16T17:11:43Z
**Source review:** /Users/rithikagarwal/Desktop/natours-claude/.planning/phases/04-browse-tours/04-REVIEW.md
**Iteration:** 1
**Scope:** `critical_warning` (CR-01, WR-01 to WR-05). The six Info findings (IN-01 to IN-06) were out of scope and are unchanged.

**Summary:**
- Findings in scope: 6
- Fixed: 4 (CR-01, WR-01, WR-04, WR-05)
- Skipped: 2 (WR-02, WR-03)
- Two fixes are marked `requires human verification` (WR-01 and WR-04), see below.

**Working tree:** Fixes were made on `main` in the main checkout, as the run note asked. `.planning/config.json` has `workflow.use_worktrees: true`, so the default would have used an isolated worktree. No worktree was created, so there was no cleanup tail to run. The worktree has no `node_modules`, so the gates could not run there.

## Fixed Issues

### CR-01: Tour write routes never answer the CORS preflight

**Status:** fixed
**Files modified:** `src/app/api/v1/tours/route.ts`, `src/app/api/v1/tours/[id]/route.ts`, `src/app/api/v1/tours/[id]/images/route.ts`, `test/app/api/tours-preflight.test.ts` (new)
**Commit:** d7ab4c8
**Applied fix:** Each of the three write-route files now exports `OPTIONS = handlePreflight`, which is the helper that already existed in `src/server/api/origin.ts`. A new test calls `OPTIONS` on all three routes. An allowlisted origin gets 204 with `Access-Control-Allow-Origin`, the allowed methods and headers, and `Max-Age 600`. A stranger origin gets 204 with no `Access-Control-*` headers.
**Verification:** Without the export, the six new tests fail (`The route module has no OPTIONS handler`). With it, all six pass.
**Note:** The read-only tour routes (`stats`, `top-5-cheap`, `monthly-plan`, `distances`, `within`) do not export `OPTIONS`. A simple cross-origin GET needs no preflight, and the review scoped this finding to the write routes. `docs/contracts.md` line 348 could be read to cover them too, so the orchestrator may want to decide that.

### WR-01: Non-Latin tour names produce an empty slug

**Status:** fixed: requires human verification
**Files modified:** `src/server/modules/tours/schemas.ts`, `test/app/api/tours-write.test.ts`
**Commit:** f63d6ec
**Applied fix:** `TOUR_NAME` now refuses a name whose `slugify` output is empty, with `messages.validation.invalidValue`. The check applies to create and to rename, because both use `TOUR_NAME`. The API answers 400 on path `name` before any write.
**Verification:** The new test (Devanagari name, create and rename) fails without the change and passes with it.
**Needs a decision:** The review offered two options: refuse such names, or transliterate or use an id-based slug and record an ADR. This fix takes the first. If non-Latin tour names are wanted, the rule will need an ADR and a different slug. Names are refused only when they contain no ASCII letters or digits, so mixed names such as `Hampi नमस्ते` still work.

### WR-04: The rate limit runs after the full upload is read and parsed

**Status:** fixed: requires human verification
**Files modified:** `src/server/api/with-api.ts`, `src/app/api/v1/tours/[id]/images/route.ts`, `test/server/api/with-api.test.ts`, `docs/contracts.md`, `docs/adr/0041-rate-limit-before-the-body-for-uploads.md` (new), `docs/adr/README.md`
**Commit:** c7010d1
**Applied fix:** `withApi` has a new option, `rateLimitBeforeBody`. It runs after access, params and query, and before the body or upload is read. Its key receives `{ request, user }` only. The existing `rateLimit` option is unchanged and still runs after the body. The image route uses `rateLimitBeforeBody`, because its key needs only the user.
**Verification:** A new test sends a 5000-byte upload to a route with a 4096-byte limit, after the caller has used their one allowed point. It expects 429 and `request.bodyUsed === false`. Without the change the response is 413 and the test fails. A second test checks that an under-limit caller still reaches the handler with the parsed upload.
**Documentation:** ADR 0041 records the change, since it amends ADR 0017's fixed pipeline order. `docs/contracts.md` is updated to match.
**Needs review:** The review suggested `rateLimit.beforeBody: true`. A union of the two shapes stopped TypeScript from typing the key of every existing route, so the option is a separate field. That choice is recorded in ADR 0041.

### WR-05: Tour write schemas accept duplicate stop days and duplicate guides

**Status:** fixed
**Files modified:** `src/server/modules/tours/schemas.ts`, `test/app/api/tours-write.test.ts`
**Commit:** b007ec6
**Applied fix:** `LOCATIONS` refuses two stops with the same `day`, on path `locations`. `GUIDES` refuses a repeated id, on path `guides`. The guide comparison ignores case, since `OBJECT_ID_HEX` accepts either case. Both apply to create and update.
**Verification:** Three tests cover create and update. Without the change, the duplicate-day and duplicate-guide tests fail. The guide test uses a real active guide, so that the only reason to refuse the body is the repeat.
**Not applied:** The review's snippet used `.max(MAX_GUIDES)`, but no such constant exists, and neither `plan.md` nor `docs/contracts.md` sets a guide limit. No maximum was added, and choosing one is a product decision.
**Not applied:** The review also suggested keying `MapFrame` by index. That change was left out because the schema rule covers new data only. Tours already stored with repeated days still produce duplicate React keys in `MapFrame`.

## Skipped Issues

### WR-02: The root layout always renders the logged-out header

**File:** `src/app/layout.tsx:35`
**Reason:** Skipped on evidence, not because the helper is missing. `getCurrentUser()` already exists in `src/server/session.ts`, and `BookingSection` already calls it. Wiring it into the root layout would make every route depend on the database. A database outage would then throw out of the root layout. Error boundaries sit inside the layout, so `app/error.tsx` would not render, and every page would fall back to `global-error.tsx`, including the not-found page. That changes failure behaviour across the whole app and needs a decision. Possible routes: accept the behaviour change, or read the cookie with the database-free `getSession()` for the shell. The second route would show the Account link to a deactivated account until the account page refuses it.
**Original issue:** A signed-in visitor sees "Log in" in the shell.

### WR-03: Per-tour and credits cache entries have no time bound

**File:** `src/server/adapters/real-cache.ts:11-15`
**Reason:** The premise does not hold as stated, so no change was made. The review says these entries "live until a tag is cleared". In the installed Next.js 16.4.5, `unstable_cache` with `revalidate` undefined stores the entry with `revalidate: CACHE_ONE_YEAR_SECONDS`. The source is `node_modules/next/dist/server/web/spec-extension/unstable-cache.js`, around line 28. So the entries are bounded to one year, not unbounded.
**Still open:** The staleness is real for up to a year. A seed run or date roll does not invalidate `tour-detail`, `tour-guides`, `reviews` or `credits` in a running server. ADR 0031 and `docs/contracts.md` section 11 say a restart clears this. That is not verified: it depends on whether Next's on-disk fetch cache survives a restart. Recommended follow-up: choose a bound, for example the 3600 seconds the reviewer suggested to match the catalogue, then correct those documents. The bound is a product and operations decision, so it was not made here.
**Original issue:** Cached tour detail keeps old start dates after a seed or date roll.

## Verification

**Gates run on the main checkout:** `npx tsc --noEmit` and `npx vitest run`, plus `npx eslint --max-warnings=0` on every changed `.ts` file and `npx prettier --check` on every changed file. Each fix was also checked for red and green (see per-finding notes).

**Results:**
- `npx tsc --noEmit`: exit 0, before and after the fixes.
- `npx vitest run` baseline before any edit: 95 files, 1184 tests, all passing.
- `npx vitest run` after all four commits: 96 files, 1195 tests, all passing. The 11 new tests are six preflight tests, three tour-schema tests and two rate-limit tests.
- `eslint --max-warnings=0` on changed `.ts` files: exit 0.
- `prettier --check` on changed files: pass.
- Red checks: CR-01 (6 tests), WR-01 and WR-05 (3 tests), and WR-04 (1 test) each fail without their fix and pass with it.

**Not run:** Playwright specs under `test/app/**/*.spec.ts` and the full `npm run lint`. Only the changed files were linted.

## Commits

| Finding | Commit | Subject |
| --- | --- | --- |
| CR-01 | d7ab4c8 | fix(tours): CR-01 answer the CORS preflight on the tour write routes [S10, B4] (04) |
| WR-01 | f63d6ec | fix(tours): WR-01 refuse a tour name with no Latin letters or digits [B4, S4, F6] (04) |
| WR-05 | b007ec6 | fix(tours): WR-05 refuse repeated stop days and repeated guides [B4, S4] (04) |
| WR-04 | c7010d1 | fix(api): WR-04 check the upload rate limit before the body is read [S16, SEC-05, SEC-17] (04) |

The commit subjects use `(04)` for the plan number. These fixes belong to the phase review, not to a single plan. `REVIEW-FIX.md` itself is not committed.

---

_Fixed: 2026-11-16T17:11:43Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
