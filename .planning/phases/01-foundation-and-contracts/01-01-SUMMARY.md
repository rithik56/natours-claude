---
phase: 01-foundation-and-contracts
plan: 01
subsystem: infra
tags: [nextjs, mongoose, vitest, mongodb-memory-server, docker-compose, zod]

requires: []
provides:
  - Next.js 16.4.5 app with a server-rendered `/` (html lang en-IN) and `/readyz` that pings MongoDB
  - Lazy Zod config (`getConfig`) and a cached, fail-fast Mongoose connection (`connectDb`, `pingDb`)
  - docker-compose.yml with MongoDB 8.0 on 127.0.0.1 and a named volume
  - Vitest harness with one in-memory MongoDB per run and a database name per test file
  - Repository hygiene (.gitignore, .nvmrc, .npmrc, .env.example) and a committed lockfile
affects: [01-02, 01-03, 01-04, 01-05, 01-07, 01-09, 01-11]

actuals:
  tokens: 3700
  tasks: 3
  commits: 2
plan_head_before: 4f6d5b837bbe9e4d7c04db2c054bacc077411eb1
plan_head_after: 6dde1883155c3ce54738eef2334e32d578ccfa98

tech-stack:
  added: [next 16.4.5, react 19.3.1, react-dom 19.3.1, typescript 5.9.3, zod 4.6.7, mongoose 9.12.0, server-only 0.0.1, eslint 9.39.5, eslint-config-next 16.4.5, vitest 5.1.0, "@vitest/coverage-v8 5.1.0", mongodb-memory-server 11.3.0]
  patterns:
    - "Config is read lazily at request time, never at module scope, so `next build` needs no environment"
    - "Root layout is async and awaits connection(), so every page renders per request"
    - "connectDb() caches its promise on globalThis.__natoursMongo and clears it on rejection"
    - "One mongod in vitest globalSetup, a unique database name per test file"

key-files:
  created:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/readyz/route.ts
    - src/server/config-schema.ts
    - src/server/config.ts
    - src/server/db.ts
    - docker-compose.yml
    - vitest.config.ts
    - test/global-setup.ts
    - test/setup.ts
    - test/empty.ts
    - test/app/readyz.test.ts
    - test/app/readyz-unavailable.test.ts
    - .gitignore
    - .nvmrc
    - .npmrc
    - .env.example
  modified:
    - package.json
    - package-lock.json
    - tsconfig.json
    - next.config.ts
    - eslint.config.mjs

key-decisions:
  - "Test MongoDB pinned to 8.0.34 (newest 8.0.x with a macOS arm64 binary; same version as the mongo:8.0 Docker image)"
  - "typescript and eslint-config-next pinned exactly (5.9.3, 16.4.5); other packages keep the caret ranges the plan names"
  - "readyz returns only status and checks.mongo; no error text, host or URI (T-01-01)"

patterns-established:
  - "Tests are named with their requirement ID, for example it('[B10] ...')"
  - "Tests that need an unreachable database stub MONGODB_URI, clear globalThis.__natoursMongo and import the route dynamically after vi.resetModules()"

requirements-completed: [D9, Q1, Q7, Q11, B10, B17, R1]

coverage:
  - id: D1
    description: "`/` is server-rendered HTML inside html lang en-IN with the heading Natours and one true sentence, and `next build` lists it as dynamic"
    requirement: R1
    verification:
      - kind: other
        ref: "npm run build (route table shows ƒ /) plus curl http://localhost:3100/ contains <html lang=\"en-IN\""
        status: pass
    human_judgment: false
  - id: D2
    description: "/readyz answers 200 ready with MongoDB up and 503 not-ready within about 5 seconds with MongoDB stopped"
    requirement: B10
    verification:
      - kind: unit
        ref: "test/app/readyz.test.ts#[B10] /readyz answers 200 with status ready when MongoDB answers"
        status: pass
      - kind: unit
        ref: "test/app/readyz-unavailable.test.ts#[B10] /readyz reports not ready within the selection timeout"
        status: pass
      - kind: other
        ref: "tracer: docker compose stop mongo then curl /readyz returned 503 in 5.19 s"
        status: pass
    human_judgment: false
  - id: D3
    description: "connectDb caches its promise on globalThis and clears a rejected attempt so the next call retries"
    requirement: B17
    verification:
      - kind: unit
        ref: "test/app/readyz.test.ts#[B17] connectDb returns the same promise on every call"
        status: pass
      - kind: unit
        ref: "test/app/readyz-unavailable.test.ts#[B17] a failed connection attempt is not cached, so the next call retries"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each test file gets its own database name; build output and env files are gitignored; the lockfile is committed and in sync"
    requirement: Q7
    verification:
      - kind: other
        ref: "git check-ignore for .env.local, .next, dist, coverage, .lighthouseci, playwright-report; ! check-ignore .env.example; npm ci --dry-run"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 01: Walking Skeleton Summary

**Next.js 16.4.5 app with a per-request server-rendered `/`, a `/readyz` that pings MongoDB and answers 503 in about 5 seconds when it is down, and a Vitest harness running on an in-memory MongoDB 8.0.34 with a database per test file.**

## Performance

- **Duration:** about 15 min for this continuation dispatch (Task 1 was the user's package-list approval)
- **Completed:** 2026-11-09
- **Tasks:** 3 of 3 (Task 1 was a gate, nothing installed before approval)
- **Files modified:** 22 (21 in the two task commits plus this summary's tracking files)

## Accomplishments

- Tracer: browser-equivalent request to `/` (HTML contains `<html lang="en-IN"`, the Natours heading and the Ladakh and Kerala sentence) and curl to `/readyz` through to MongoDB 8.0 in Docker, including the 503 path after `docker compose stop mongo`.
- `next build` succeeds with no environment variables set and lists `/` as dynamic (ƒ), because config is lazy and the root layout awaits `connection()`.
- `npm test` is green (4 tests) against one in-memory mongod with a unique database per test file; coverage run passes the 75% line threshold (100% lines on `src/server`).

## Task Commits

1. **Task 1: Approve the Phase 1 package list and confirm Node 24** - no commit (gate; user replied "Approved", Node v24.22.2, npm 11.19.1, Docker 28.5.1)
2. **Task 2: End-to-end tracer** - `334f487` (feat)
3. **Task 3: Repository hygiene and the Vitest harness** - `6dde188` (test)

**Plan metadata:** added in the final docs commit.

Tracer feedback gate: the task carries no `gate` attribute, the run is interactive with `human_verify_mode` end-of-phase, and the tracer `<verify>` is automated only, so the gate re-ran verification end to end (build, ready, `lang="en-IN"`, 503 after stopping MongoDB, typecheck, pin checks). It passed and execution continued to Task 3 with no checkpoint.

TDD note for Task 3: the code under test (`db.ts`, `/readyz`) was written in Task 2 as the plan orders, so a failing RED commit was not possible. The tests were instead proven to detect regressions by temporarily disabling the cache in `connectDb`; the B17 test failed, then passed again after reverting.

## Installed versions (for ADR 0001, plan 01-02)

Node v24.22.2, npm 11.19.1, Docker 28.5.1. `npm ls --depth=0`:

- next 16.4.5, react 19.3.1, react-dom 19.3.1, zod 4.6.7, mongoose 9.12.0, server-only 0.0.1
- typescript 5.9.3, @types/node 24.19.2, @types/react 19.3.0, @types/react-dom 19.3.0, eslint 9.39.5, eslint-config-next 16.4.5
- vitest 5.1.0, @vitest/coverage-v8 5.1.0, mongodb-memory-server 11.3.0

mongod used by tests: 8.0.34 (`package.json` `config.mongodbMemoryServer.version`), downloaded fine on macOS arm64. Not yet confirmed on Linux CI (assumption A3 stays open until plan 01-03). Local Docker image `mongo:8.0` is also 8.0.34. The default 8.2.6 binary was cached during install and is unused.

Scaffold flags: every flag in the plan exists on `create-next-app@16.4.5` (`--no-tailwind`, `--no-agents-md`, `--no-react-compiler`, `--no-cache-components`, plus `--no-agent-feedback`). I also passed `--skip-install` since the install happens in the repository. The scaffold produced no `cacheComponents` setting with `--no-cache-components`.

## Files Created/Modified

- `src/app/layout.tsx` - async root layout, `await connection()`, `<html lang="en-IN">`, no fonts or CSS
- `src/app/page.tsx` - Server Component with the Natours heading and one sentence
- `src/app/readyz/route.ts` - `GET` returns 200 or 503 JSON with `cache-control: no-store`
- `src/server/config-schema.ts` - Zod schema (`APP_ENV`, `MONGODB_URI`, `DB_SERVER_SELECTION_TIMEOUT_MS`) and `parseConfig`
- `src/server/config.ts` - lazy memoised `getConfig()`
- `src/server/db.ts` - cached fail-fast `connectDb()` and never-throwing `pingDb()`
- `docker-compose.yml` - mongo:8.0 on 127.0.0.1:27017 with `mongo-data` volume and a healthcheck
- `vitest.config.ts`, `test/*` - aliases, TZ=UTC, APP_ENV=test, global in-memory MongoDB, per-file database, two readyz test files
- `.gitignore`, `.nvmrc`, `.npmrc`, `.env.example` - repository hygiene
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` - scaffold with pins, strict flags and scripts

## Decisions Made

- Test mongod pinned to 8.0.34, the newest 8.0.x with a macOS arm64 build when probed (8.0.35 to 8.0.40 returned 403), matching the Docker image.
- `setup.ts` always overwrites `MONGODB_URI` with the in-memory URI, so a `MONGODB_URI` exported in a developer's shell can never point tests at a real database. Tests that need another URI stub it with `vi.stubEnv` inside the test.
- Added one test beyond the plan's three: a failed connection attempt is not cached (QA-19), which closes the "rejected attempt is cleared" truth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `--skip-install` and `--no-agent-feedback` added to create-next-app**
- **Found during:** Task 2
- **Issue:** The plan's flag list would install dependencies inside the throwaway scaffold, wasted work since the repository install follows. The scaffold also offers an agent-feedback prompt.
- **Fix:** Added `--skip-install` and `--no-agent-feedback`; the repository was then installed with the pinned versions.
- **Files modified:** none (scaffold run outside the repository)
- **Verification:** scaffold output matched the plan's expectations (empty `next.config.ts`, no `cacheComponents`).

**2. [Rule 3 - Blocking] Exact pins for typescript and eslint-config-next**
- **Found during:** Task 2
- **Issue:** A plain `npm install -D typescript@5.9.3` records `^5.9.3`, which fails the plan's own check (`typescript.startsWith('5.9')`).
- **Fix:** Reinstalled both with `--save-exact`.
- **Files modified:** `package.json`, `package-lock.json`
- **Committed in:** `334f487`

---

**Total deviations:** 2 auto-fixed (Rule 3). **Impact on plan:** none on scope or outputs.

## Issues Encountered

- Vitest prints a warning that `vitest.config.ts` uses ESM syntax in a file loaded as CommonJS. It is harmless today; the cleanest fixes are `"type": "module"` in `package.json` or a `.mts` config, both outside this plan's file list. Plan 01-03 (tooling) should decide.
- `npm audit` reports a moderate `minimatch` advisory inside `typescript-eslint` via `eslint-config-next`. CI uses `--audit-level=high`, so it does not block; revisit when 01-03 wires the audit step.
- npm 11.19 warns that the `mongodb-memory-server` postinstall (and `fsevents`) are not covered by `allowScripts`. The postinstall ran and only pre-downloads the mongod binary, as RESEARCH noted.
- `.planning/PROJECT.md`, `.claude/settings.json`, `CLAUDE.md`, `.planning/config.json`, `.planning/state.json` and `docs/` were left untouched and uncommitted, per the commit hygiene instructions.

## Known Stubs

None. `/` carries one real sentence and no placeholder content.

## Threat Flags

None beyond the plan's threat model. T-01-01 to T-01-04 and T-01-SC are mitigated as planned: `/readyz` leaks no error text (asserted in the B10 test), connection failures are bounded by `serverSelectionTimeoutMS` and not cached, `.env*` is ignored except `.env.example`, and MongoDB is published on 127.0.0.1 only.

## User Setup Required

None. Node 24 and Docker were confirmed at the Task 1 gate.

## Next Phase Readiness

Plan 01-02 and later plans can build on `getConfig`, `connectDb` and the Vitest harness. Open items for later plans: the vitest config module-type warning, confirming the 8.0.34 binary on Linux CI, and adding `.gitignore` entries for any new build folders.

## Self-Check: PASSED

---
*Phase: 01-foundation-and-contracts*
*Completed: 2026-11-09*
