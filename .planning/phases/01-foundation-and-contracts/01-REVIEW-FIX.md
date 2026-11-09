---
phase: 01-foundation-and-contracts
fixed_at: 2026-11-09T17:10:00Z
review_path: .planning/phases/01-foundation-and-contracts/01-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-11-09
**Source review:** .planning/phases/01-foundation-and-contracts/01-REVIEW.md
**Iteration:** 1

**Summary:**

- Findings in scope: 5 (WR-02, WR-03, WR-06, WR-07, WR-08, as chosen by the user)
- Fixed: 5
- Skipped: 0

Not in scope, left open on purpose: WR-01, WR-04, WR-05, WR-09 and IN-01 to IN-04.

**Where verification ran:** the main checkout on branch `gsd/phase-01-foundation-and-contracts`, with no worktree (the orchestrator runs this phase sequentially on the main tree). Every number below is reproducible from that tree. Nothing was run on GitHub Actions and nothing was pushed.

## Fixed Issues

### WR-02: `toReview` throws a `TypeError` when the author is `null`

**Files modified:** `src/server/modules/reviews/dto.ts`, `src/server/modules/tours/dto.ts`, `test/server/modules/reviews/model.test.ts`, `test/server/modules/tours/dto.test.ts`
**Commit:** 8e17cc6
**Applied fix:** `isAuthorRecord` and `isGuideRecord` now check `!== null` before the `in` operator, so a null author or guide reaches the existing "not populated" error. A code comment records that omitting or standing in for a deleted author is a Phase 4 service decision; nothing was invented here.
**Regression tests:** "throws the not-populated error, not a TypeError, when the author no longer exists (WR-02)" (reviews, a real deleted user populated to `null`) and "toTourDetail throws the not-populated error, not a TypeError, when a guide no longer exists (WR-02)" (tours, populate with `retainNullValues`).
**Red:** both failed with `expected TypeError: Cannot use 'in' operator to se… to not be an instance of TypeError`. Both pass after the fix.
**Verified:** full gate suite exit 0 (see below). The first run of `check:conventions` failed because a comment line began with a backtick-`in`; the comment was reworded and the suite rerun.
**Status:** fixed (local only).

### WR-03: Password `maxlength: 72` counts characters, but bcrypt truncates at 72 bytes

**Files modified:** `src/server/modules/users/model.ts`, `src/lib/messages.ts`, `test/server/modules/users/model.test.ts`, `docs/contracts.md`
**Commit:** 97af577
**Applied fix:** the character `maxlength` stays. A schema validator rejects any password for which `bcrypt.truncates()` is true (more than 72 bytes in UTF-8), with a new plain message `validation.passwordTooLong` ("That password is too long. Use a shorter one, or fewer accented or non-English letters."). `docs/contracts.md` now states the byte rule next to the existing 8 to 72 characters.
**Not done:** no Zod schema for login, register or change-password exists yet, so the byte check was not added there. Phase 2 forms must use the same rule; the model is the backstop.
**Regression tests (WR-03 block):** accepts 24 Devanagari characters (72 bytes); rejects 25 with the friendly message; accepts 72 ASCII and rejects 73; `save()` of a changed password past 72 bytes is rejected and the stored hash still matches the old password.
**Red:** "rejects 25 Devanagari characters" and "save() does not silently accept a changed password past 72 bytes" failed with `promise resolved ... instead of rejecting`. The other two pass before and after, as they should (they pin existing behaviour).
**Verified:** full gate suite exit 0. Mutation check: restoring `model.ts` to its pre-fix version makes those two tests fail again.
**Status:** fixed: requires human verification (validation logic).

### WR-06: `isDbUnavailableError` misses common driver outage errors

**Files modified:** `src/server/db.ts`, `test/server/db.test.ts`
**Commit:** 2be5d5d
**Applied fix:** added `MongoNetworkTimeoutError`, `MongoPoolClearedError`, `MongoTopologyClosedError` and `MongoNotConnectedError` to the name set. All four were confirmed in the installed `mongodb` 7.8.0 (`lib/error.js` and `lib/cmap/errors.js`, each with a `get name()` returning that string). `MongoPoolClearedError` is the `name` of the driver's `PoolClearedError` class. None was dropped.
**Regression tests:** the existing `it.each` now lists all seven names, and the "false for other errors" test also asserts `MongoServerError` and `MongoParseError` map to false.
**Red:** the four new `[B10] is true for ...` cases failed with `expected false to be true`. All pass after the fix.
**Verified:** full gate suite exit 0. Not exercised against a live outage.
**Status:** fixed (local only).

### WR-07: CI jobs have no `timeout-minutes`

**Files modified:** `.github/workflows/ci.yml`
**Commit:** 03014b8
**Applied fix:** `timeout-minutes: 15` on `checks` and `20` on `build`. Reasoning: the first green run (GitHub run 42655320866, read with `gh run view`) took 63 seconds for `checks` and 74 seconds for `build`, so the limits are roughly 14 and 16 times that, enough for a cold npm cache and the MongoDB binary download while still stopping a hang within minutes instead of the default 360.
**Verified:** Ruby `YAML.load_file` parses the file and returns `checks: 15` and `build: 20`; `prettier --check` passes; full gate suite exit 0. No unit test is possible.
**Not verified:** GitHub Actions cannot run here. The workflow change is unproven until GitHub runs it on the next push.
**Status:** fixed (local only, cannot be confirmed until CI runs).

### WR-08: The password-change cut-off uses the pinned clock, but the JWT `iat` uses the wall clock

**Files modified:** `src/server/session.ts`, `test/server/session-clock.test.ts` (new), `docs/adr/0015-sessions-read-the-user-every-request.md`, `docs/contracts.md`
**Commit:** 11336ae
**Applied fix:** took the reviewer's second option so the whole session layer reads one clock. Read in jose 6.2.15's source: `setIssuedAt` and `setExpirationTime` accept exact seconds, and their string and no-argument forms read the real clock; `jwtVerify` takes `currentDate`. `signSession` now computes `issuedAt = floor(now() / 1000)` and passes `setIssuedAt(issuedAt)` and `setExpirationTime(issuedAt + SESSION_MAX_AGE_SECONDS)`; `getSession` passes `currentDate: now()`. Kept: HS256 only, required `exp`/`iat`/`sub`, no role claim, the same-second rule, the 7-day lifetime, the cookie options. No signature changed. ADR 0015 gained one sentence recording the one-clock rule, and `docs/contracts.md` gained one sentence in the Token bullet because that is documented behaviour.
**Regression tests:** new `test/server/session-clock.test.ts`, run with the one clock pinned 2035 (later than the real clock) and 2020 (earlier): "signs iat and exp from the pinned clock", "expiry follows the pinned clock: valid just inside 7 days, refused just past it", and "a token signed after a password change is accepted and one signed before it is refused" (the password change goes through `save()` so the model hook stamps `passwordChangedAt`). The test moves the clock by mocking `@/server/clock`'s `now`, which is the single seam both the model and the session layer read, rather than setting `APP_NOW`, because `getConfig()` caches and the User model is registered once per process.
**Red:** all six cases failed before the fix, for example `expected 1794243215 to be 2064285000` (iat from the real clock), `expected { userId, iat } to be null` (expiry judged by the real clock) and `expected undefined to be '<user id>'` / `expected { id, name, ... } to be null` (the cut-off compared across two clocks). All pass after the fix. The existing hostile-token tests in `session.test.ts` and `current-user.test.ts` pass unchanged.
**Verified:** full gate suite exit 0. Mutation check: restoring `session.ts` to its pre-fix version makes all six new tests fail.
**Status:** fixed: requires human verification (clock logic).

## Verification

Run in the main checkout after the last commit (11336ae), each as its own command:

| Gate | Exit |
|------|------|
| `npm run typecheck` | 0 |
| `npm run lint` | 0 |
| `npm run lint:css` | 0 |
| `npm run format:check` | 0 |
| `npm run check:client` | 0 |
| `npm run check:conventions` | 0 |
| `npm run check:env` | 0 |
| `npm run knip` | 0 |
| `npm run test:coverage` | 0 (45 files, 614 tests passed) |
| `npm run build` | 0 |
| `npm audit --audit-level=high` | 0 (only moderate advisories, which are not in scope) |

The same ten gates also passed after each of the five fixes before its commit.

Not run: GitHub Actions. All five fixes are verified locally only, and WR-07 in particular cannot be confirmed until GitHub runs the workflow.

---

_Fixed: 2026-11-09_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
