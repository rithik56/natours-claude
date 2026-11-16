---
phase: 04-browse-tours
plan: 02
subsystem: infra
tags: [seed, storage, media-route, next-image, mongoose, zod, tsx, vitest]

requires:
  - phase: 04-browse-tours
    provides: "photoCredits[].alt, the approved seed content and the 52 credited photos (plan 04-01)"
provides:
  - "npm run seed: 13 tours, 35 users, 52 reviews and 58 bookings loaded by fixed _id, idempotent, with --reset in development, test and ci"
  - "Storage.get and a root-relative urlFor (/media/<key>) in every adapter"
  - "createLocalDiskStorage(rootDir): development and ci photos on disk under STORAGE_DIR, every key confined to it"
  - "GET /media/[...key]: stored photos with their content type and a one-day cache; 404 unstored; 400 malformed"
  - "images.localPatterns for /media/** only, with no remote host, so the CSP is unchanged"
  - "ADR 0029 records the storage contract and the D2 localPatterns deviation"
affects: [04-03, 04-04, 04-05, 04-06, 04-07, 04-08, 04-09, 04-10, 04-11, 04-12, 04-13]

# Actuals (#2632). Same estimateTokens scale: chars/4 over the realised diff of this plan's commits, lockfile included.
actuals:
  tokens: 19114
  tasks: 3
  commits: 7

# Measured against the start-of-run HEAD recorded by the worktree branch check (#3968).
commits: 7
plan_head_before: 0b709d4db78bed988a0d27dd252e98e4ea3c5270
plan_head_after: 0f42782

tech-stack:
  added:
    - "tsx 4.23.15 (dev, exact pin): runs scripts/seed.ts with the @/ aliases and server-only (ARC-04)"
  patterns:
    - "Adapters are chosen by APP_ENV: test keeps the in-memory fake, development and ci use the disk adapter, staging and production throw until Phase 8"
    - "Seed writes go through getDeps().storage and the models, never a cache service (ARC-03)"
    - "Seed load is create-or-set-and-save-if-modified by fixed _id, so a re-run changes nothing"
    - "Storage keys are one to four segments of ^[a-z0-9][a-z0-9._-]*$, confined to the storage directory"

key-files:
  created:
    - scripts/seed.ts
    - scripts/seed/load.ts
    - scripts/seed/run.ts
    - src/server/adapters/local-disk-storage.ts
    - src/app/media/[...key]/route.ts
    - test/scripts/seed.test.ts
    - test/app/media-route.test.ts
    - test/server/adapters/local-disk-storage.test.ts
    - docs/adr/0029-disk-storage-and-the-media-route.md
  modified:
    - package.json
    - package-lock.json
    - src/server/adapters/storage.ts
    - src/server/deps.ts
    - src/server/config-schema.ts
    - .env.example
    - .gitignore
    - next.config.ts
    - src/proxy.ts
    - test/proxy.test.ts
    - test/next-config.test.ts
    - test/helpers/factories.ts
    - test/server/deps.test.ts
    - test/server/adapters/fakes.test.ts
    - test/server/modules/tours/model.test.ts
    - test/server/modules/tours/dto.test.ts
    - docs/adr/0016-adapters-selected-by-app-env.md
    - docs/adr/README.md
    - docs/contracts.md

key-decisions:
  - "Storage keys are full tours/<file> keys in imageCover, images and photoCredits[].file (QA-03). Reversible: one prefix in toTourDocument and the factories."
  - "The disk adapter's put refuses a content type that disagrees with its extension, so a stored file's type always comes from the fixed map. Reversible."
  - "readSeedPasswords also requires SEED_USER_PASSWORD to be at least 8 characters, the User model's own minimum, so a short value stops the seed before any write."
  - "runSeed takes { reset, passwords }. parseSeedArgs validates --today as a real day and returns it, but nothing applies it until the date roll lands in 04-03. The plan's artifact list named runSeed({ today, reset }); the date roll is 04-03's job, so today is not passed yet."
  - "A password is set on a seed user only when the stored hash no longer matches the configured value (RESEARCH Pitfall 3), so re-runs leave passwordChangedAt untouched."
  - "Tour createdAt is the fixed instant 2026-10-01 09:00 IST plus one minute per position in tours.json, as Pattern 4 specifies."
  - "The seed's photo list is the 52 distinct photoCredits file names in tours.json, read from seed/img/tours."
  - "The media route answers 400 for a malformed path before storage is read, and 404 for a well-formed key that is not stored (ADR 0029)."

patterns-established:
  - "Seed loaders take fixed _ids from seed/data and never import test/ (ARC-03)"
  - "A seed or storage change is verified against a real next dev server, not only the handler in a test"

requirements-completed: [D10, D2, U7]

coverage:
  - id: D1
    description: "npm run seed loads 13 tours, 35 users, 52 reviews and 58 bookings by fixed _id, and a second run changes nothing"
    requirement: D10
    verification:
      - kind: integration
        ref: "test/scripts/seed.test.ts#[D10] loads 13 tours, 35 users, 52 reviews, 58 bookings and stores 52 photos"
        status: pass
      - kind: integration
        ref: "test/scripts/seed.test.ts#[D10] a second run changes nothing: every document of the four collections is deep-equal, passwords and timestamps included"
        status: pass
      - kind: other
        ref: "npm run seed -- --reset && npm run seed, APP_ENV=development against local MongoDB: both exit 0 and print 13 tours, 35 users, 52 reviews, 58 bookings, 52 photos"
        status: pass
    human_judgment: false
  - id: D2
    description: "Seeded photos are uploaded under tours/ through the storage adapter, and /media/<key> serves them with their content type and a one-day cache"
    requirement: D2
    verification:
      - kind: integration
        ref: "test/app/media-route.test.ts#[D2] serves a stored photo with its content type and a one-day cache"
        status: pass
      - kind: other
        ref: "next dev on port 3100: GET /media/tours/valley-of-flowers-trek-cover.jpg returned 200 image/jpeg with cache-control public, max-age=86400 and nosniff"
        status: pass
    human_judgment: false
  - id: D3
    description: "Storage keys are confined to STORAGE_DIR: a key with .., a leading slash, a backslash, an empty segment, a bad segment or more than four segments is refused, and /media answers 400 for it"
    requirement: D2
    verification:
      - kind: unit
        ref: "test/server/adapters/local-disk-storage.test.ts#[D2] refuses a key with %s, for every operation"
        status: pass
      - kind: integration
        ref: "test/app/media-route.test.ts#[D2] answers 400 for a path with %s"
        status: pass
      - kind: other
        ref: "next dev on port 3100: /media/tours/Cover.jpg and a percent-encoded dot-dot path both returned 400"
        status: pass
    human_judgment: false
  - id: D4
    description: "The seed refuses production and staging --reset before connecting, and seed passwords come only from the environment and name their key on error (SEC-16, SEC-27)"
    requirement: D10
    verification:
      - kind: unit
        ref: "test/scripts/seed.test.ts#[D10] (SEC-16) refuses production before any connection"
        status: pass
      - kind: unit
        ref: "test/scripts/seed.test.ts#[D10] (SEC-27) an admin password under 16 characters is refused, and its value is never shown"
        status: pass
      - kind: other
        ref: "APP_ENV=production npm run seed exited 1 with the APP_ENV message; a short SEED_ADMIN_PASSWORD exited 1 naming the key"
        status: pass
    human_judgment: false
  - id: D5
    description: "next/image optimises only same-origin /media photos, with no remote host and the CSP unchanged"
    requirement: D2
    verification:
      - kind: unit
        ref: "test/next-config.test.ts#[D2] lets next/image optimise only same-origin /media photos, with no remote host"
        status: pass
      - kind: other
        ref: "next dev on port 3100: /_next/image for /media/tours/valley-of-flowers-trek-cover.jpg returned 200, and a remote source returned 400"
        status: pass
    human_judgment: false
  - id: D6
    description: "Tour photo keys carry the tours/ prefix in documents and in the test factories, matching what the seed writes (QA-03)"
    requirement: D2
    verification:
      - kind: unit
        ref: "test/server/modules/tours/model.test.ts#[R6] keeps startDates, images, photoCredits and locations in document order"
        status: pass
    human_judgment: false
  - id: D7
    description: "ADR 0029 and docs/contracts.md record the storage contract, the localPatterns deviation from D2, STORAGE_DIR and the seed passwords"
    requirement: D2
    verification: []
    human_judgment: true
    rationale: "The ADR wording and the decision to replace D2's remotePatterns with localPatterns are for a human reader to judge; no test checks prose."

duration: approximately 15 min (start time not recorded at plan start; worktree created 16:33 IST, last code commit 16:45 IST)
completed: 2026-11-16
status: complete
---

# Phase 04 Plan 02: Seed loader, disk storage, /media route and image delivery Summary

**`npm run seed` loads 13 tours, 35 users, 52 reviews and 58 bookings idempotently and uploads 52 photos through a disk storage adapter, which `/media/<key>` serves to next/image from the app's own origin, with keys confined and seed passwords read only from the environment**

## Status

**Complete.** All three tasks ran to their verify commands and the done criteria. Task 2 is the TDD-flagged task. No checkpoint was reached and no auth gate was hit. The MongoDB precondition for Task 1 was met (port 27017 answered a read-only probe).

## Performance

- **Duration:** approximately 15 min (not measured; the start time was not recorded at plan start)
- **Tasks:** 3 of 3 complete
- **Files changed:** 28 committed (9 created, 19 modified), plus the SUMMARY and the broken-windows entry

## Accomplishments

- `npm run seed` loads the tours, users, reviews and bookings by their fixed `_id`s, uploads the 52 photos under `tours/` through `getDeps().storage`, and prints the counts stored afterwards.
- A second run changes nothing. A test snapshots all four collections raw (password hashes, `passwordChangedAt`, `createdAt` and `updatedAt` included) and finds them deep-equal.
- `--reset` deletes the four collections and the seed photos, then rebuilds them. It is refused outside development, test and ci.
- `Storage` gains `get`, and `urlFor` returns the root-relative `/media/<key>` in both adapters. The disk adapter keeps development and ci files under `STORAGE_DIR` and refuses any key that could leave that directory.
- `GET /media/[...key]` answers 200 with the stored content type and `cache-control: public, max-age=86400`, 404 `NOT_FOUND` for an unstored key, and 400 for a malformed path (refused before storage is read).
- `next.config.ts` allows `/media/**` as the only local image source, with no remote host. The proxy skips `/media`.
- The seed refuses production before any connection, and `--reset` is limited to development, test and ci (SEC-16). `SEED_USER_PASSWORD` and `SEED_ADMIN_PASSWORD` come only from the environment; the admin's must be at least 16 characters, and a missing or short value stops the seed and names the key, never the value (SEC-27).
- `syncIndexes()` runs on all four models, so the `2dsphere` and unique indexes exist after a seed (QA-18).
- ADR 0029 is written. ADR 0016 is amended, the ADR index has its row, and `docs/contracts.md` covers sections 5, 7 and 10 and the deviations table.

## Task Commits

Each task was committed as the TDD flow requires (test first, then implementation).

1. **Task 1 dependency: tsx 4.23.15 for the seed script** - `a7f80e3` (chore)
2. **Task 1 RED: failing tests for disk storage, /media and the seed photos** - `2ef7a61` (test)
3. **Task 1 GREEN: serve seeded photos from disk through /media and load the tours** - `6d16ed9` (feat)
4. **Task 2 RED: failing tests for the full idempotent load, reset and guards** - `f0d8b4a` (test)
5. **Task 2 GREEN: load users, reviews and bookings idempotently with --reset and guards** - `c39bf81` (feat)
6. **Task 3 code: optimise only same-origin /media photos and key factory photos under tours/** - `c9ebffe` (feat)
7. **Task 3 docs: record disk storage and the media route in ADR 0029** - `0f42782` (docs)

**Plan metadata:** the commit that carries this file, `.planning/REQUIREMENTS.md` (unchanged, see below) and `.planning/WINDOWS.md`.

## Verification

Run from the worktree after the last code change:

- `npx vitest run`: 63 files and 802 tests pass.
- `npx tsc --noEmit`: exit 0.
- `npm run lint` (`eslint . --max-warnings=0`): exit 0.
- `npm run check:env`: ok. `npm run check:conventions`: 250 files, exit 0.
- Prettier `--check` on every changed source, test and doc file: exit 0.
- Task 1 verify, real run: `npm run seed` against local MongoDB into a scratch `STORAGE_DIR` exits 0, and the cover file is on disk, with 52 files in `tours/`.
- Task 2 verify, real run: `npm run seed -- --reset` then `npm run seed` both exit 0, each printing `13 tours, 35 users, 52 reviews, 58 bookings, 52 photos`.
- Negative runs: `APP_ENV=production npm run seed` exits 1 with the APP_ENV message; `SEED_ADMIN_PASSWORD` of 5 characters exits 1 naming the key.
- Real `next dev` on port 3100 with the scratch storage: `/media` cover 200 `image/jpeg` with the one-day cache and `nosniff`; unstored key 404; uppercase segment 400; percent-encoded dot-dot path 400; `/_next/image` for the local photo 200; a remote source 400. The server log held only the warn-level lines for the refused paths.

## Files Created/Modified

- `scripts/seed.ts` - `parseSeedArgs` and the guarded `main`; loads `.env.local` (values already in the environment win), checks APP_ENV, reads the passwords, prints counts
- `scripts/seed/load.ts` - reads `seed/data`, `toTourDocument` (fixed `_id`, `tours/` keys, IST start dates, fixed `createdAt`), `listSeedPhotos`
- `scripts/seed/run.ts` - `assertSeedAllowed`, `readSeedPasswords`, `runSeed` (sync indexes, reset, upload, load tours/users/reviews/bookings, count)
- `src/server/adapters/local-disk-storage.ts` - `createLocalDiskStorage`, the key confinement and the extension map
- `src/server/adapters/storage.ts` - `get`, `mediaUrlFor` and the fake's `get`
- `src/app/media/[...key]/route.ts` - `GET`, through `withApi` with a strict Zod params schema
- `src/server/deps.ts` - storage per APP_ENV; staging and production throw until Phase 8
- `src/server/config-schema.ts`, `.env.example` - `STORAGE_DIR`, `SEED_USER_PASSWORD`, `SEED_ADMIN_PASSWORD`
- `.gitignore` - `/.storage/`
- `next.config.ts`, `src/proxy.ts` - `images.localPatterns`; the proxy matcher skips `media`
- `test/helpers/factories.ts` - `createTour` stores `tours/` keys
- `test/scripts/seed.test.ts`, `test/app/media-route.test.ts`, `test/server/adapters/local-disk-storage.test.ts` - created
- `test/server/adapters/fakes.test.ts`, `test/server/deps.test.ts`, `test/proxy.test.ts`, `test/next-config.test.ts`, `test/server/modules/tours/model.test.ts`, `test/server/modules/tours/dto.test.ts` - updated for the new `urlFor`, `get`, adapter choice, matcher and `tours/` keys
- `docs/adr/0029-disk-storage-and-the-media-route.md` - created
- `docs/adr/0016-adapters-selected-by-app-env.md`, `docs/adr/README.md`, `docs/contracts.md` - amended and extended
- `package.json`, `package-lock.json` - `tsx` and the `seed` script

## Decisions Made

- The storage key for each photo is `tours/<file>` in `imageCover`, `images` and `photoCredits[].file` (QA-03). The seed loader and `createTour` add the prefix.
- `put` refuses a content type that disagrees with the extension map. That keeps a stored file's type fixed by its name.
- `SEED_USER_PASSWORD` must be at least 8 characters, the User model's own minimum, so a short value fails before any tour is written.
- `runSeed` takes `{ reset, passwords }`, not `today`. The `--today` option is validated and returned by `parseSeedArgs`, and the date roll that applies it lands in 04-03.
- A seed user's password is set only when the stored hash no longer matches, so a re-run leaves `passwordChangedAt` alone.
- The staging and production storage refusal now names Phase 8. Phase 4 delivers development and ci storage only.
- The proxy negative lookahead matches any path that starts with `media`, as its existing `api`, `healthz` and `readyz` entries do. No page starts that way today.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dependencies and the Next type file in the fresh worktree**
- **Found during:** Task 1, first verify run
- **Issue:** the worktree had no `node_modules`, and `tsc` needs `next-env.d.ts`, which is gitignored
- **Fix:** `npm ci` from the committed lockfile; `next-env.d.ts` copied from the main checkout. Neither is committed.
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** none (environment only)

**2. [Rule 1 - Bug] Storage refusal named the wrong phase**
- **Found during:** Task 1, planning the deps change
- **Issue:** the message said `Phase 4 or 8`, but Phase 4 now serves development and ci only
- **Fix:** the message names Phase 8; `test/server/deps.test.ts` updated to match
- **Committed in:** `6d16ed9`

**3. [Rule 2 - Missing Critical] Short user seed password failed late**
- **Found during:** Task 2, implementing `readSeedPasswords`
- **Issue:** the User model rejects a password under 8 characters, which would fail the seed partway through, after tours had been written
- **Fix:** `readSeedPasswords` checks the user password length up front, naming the key
- **Committed in:** `c39bf81`

**4. [Rule 1 - Bug] Two order tests expected bare photo names**
- **Found during:** Task 3, full Vitest run
- **Issue:** `[R6]` tests in `model.test.ts` and `dto.test.ts` compared stored keys with bare file names, but QA-03 stores `tours/<file>`
- **Fix:** the expectations now use the prefixed keys
- **Committed in:** `c9ebffe`

**Total deviations:** 4 auto-fixed (2 Rule 1, 1 Rule 2, 1 Rule 3). **Impact on plan:** none on the outcome. Each change keeps the plan's behaviour and its security rules.

## Issues Encountered

- **The commit ledger file could not be written.** The worktree's write guard refuses paths inside the git directory. `commits` is therefore measured from the start-of-run HEAD (`0b709d4`) recorded by the branch check. `git rev-list --count 0b709d4..HEAD` gives 7.
- **The seven task commits lack the `Co-Authored-By: Claude Haiku 5.5` trailer.** The attribution reminder asks for it, and I missed it on the task commits. This metadata commit carries it. The sandbox refused the compound rebase needed to add it to the earlier commits, and rewriting them would have meant moving this agent's branch, which the worktree rules forbid. The earlier commits need the trailer added by whoever owns this branch.
- **The GSD RED/GREEN gate reads commit scope differently.** Its regex expects `test(04-02):`, but the project's CLAUDE.md format is `test(seed): ... [D2, D10] (04-02)`, with the plan number at the end. The RED and GREEN commits are present in order, but the gate will not match them. The verifier should know this.
- **`gsd_run check tdd-red-evidence` was not run.** The plan's RED commits were checked by reading the failures, not by the classifier. The gate applies to `type: tdd` plans, and this plan is `type: execute`, so it does not gate the phase. Recording it here so it is not assumed.
- **Task 1 RED failed at module load for three suites.** `local-disk-storage`, `media-route` and `scripts/seed.ts` did not exist, so they failed on import. Three assertions also failed: the fake `urlFor`, the fake `get`, and development storage holding in-memory files. Task 1 is not flagged `tdd="true"`, so this is recorded as context, not as a gate.
- **Task 2 RED passed 18 of 26 tests.** The guards, the argument parser, and the tour and photo tests already passed from Task 1. The second-run deep-equal test also passed at RED, because the tours alone were already stable. It became meaningful once users, reviews and bookings were loaded at GREEN.
- **Shared requirement IDs stay open.** `requirements.ready-ids` reported D10, D2 and U7 as blocked, because sibling plans also declare them and have no SUMMARY yet. REQUIREMENTS.md is therefore unchanged. The last plan to declare each ID will mark it.
- **Lint.** The first ESLint run flagged an unused `eslint-disable` on `rm`, which this rule does not check. The directive was removed. The other `fs` calls keep theirs.

## Known Stubs

- **`--today`:** `parseSeedArgs` validates and returns it, but `runSeed` does not apply it, so the date roll is not wired. It is due in plan 04-03. Recorded in `.planning/WINDOWS.md` as an open stub for phase 04.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: supply-chain (install script) | package-lock.json | `tsx` pulls in `esbuild`, which has a `postinstall` script that npm reported at install. The threat model (T-04-SC) states that `tsx` has no postinstall. The pin is exact and the script comes from a transitive dependency. Review before the next install. |

## User Setup Required

Developers who run `npm run seed` need `SEED_USER_PASSWORD` and `SEED_ADMIN_PASSWORD` in `.env.local`. The admin's must be at least 16 characters. Both stay out of committed files, and `npm run check:env` checks that `.env.example` leaves them empty. No external service is involved.

## Next Phase Readiness

- 04-03 wires `--today` into the date roll, and adds the README rule checks and CI wiring for the seed.
- D10, D2 and U7 are marked complete by whichever declaring plan finishes last, once `requirements.ready-ids` clears them.
- Staging and production still throw for storage until Phase 8 adds S3 behind the same `Storage` interface.

## Self-Check

Checked against the worktree before this file was written:

- Created files exist: `scripts/seed.ts`, `scripts/seed/load.ts`, `scripts/seed/run.ts`, `src/server/adapters/local-disk-storage.ts`, `src/app/media/[...key]/route.ts`, `docs/adr/0029-disk-storage-and-the-media-route.md`, and `docs/contracts.md`.
- All seven task commits are on this branch, in order, from `a7f80e3` to `0f42782`.
- `npx vitest run`: 63 files and 802 tests pass. `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0.
- The worktree was clean apart from the broken-windows entry before this commit.

## Self-Check: PASSED

---
*Phase: 04-browse-tours*
*Completed: 2026-11-16*
