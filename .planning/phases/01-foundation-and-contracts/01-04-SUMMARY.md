---
phase: 01-foundation-and-contracts
plan: 04
subsystem: infra
tags: [zod, config, nextjs-instrumentation, github-actions, env]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-01 config-schema/config/db, plan 01-03 CI workflow, check scripts and lint rules"
provides:
  - "Complete Phase 1 config schema (APP_ENV, APP_URL, MONGODB_URI, DB_SERVER_SELECTION_TIMEOUT_MS, SESSION_SECRET, CORS_ORIGINS, LOG_LEVEL, APP_NOW) with cross-field rules"
  - "ConfigError and parseConfig; getConfig() with appOrigin, corsOrigins and isProductionLike"
  - "loadConfigOrExit() called from register(): stderr names bad keys, never values, then exit 1"
  - ".env.example for every key, npm run check:env (D4, S18) and npm run smoke against the built app"
  - "CI runs check:env, and the build job runs smoke against a MongoDB service"
  - "ADR 0010"
affects: [01-05, 01-06, 01-07, 01-09, 01-13, 01-15]

actuals:
  tokens: 9500
  tasks: 2
  commits: 5
plan_head_before: 95798e1e3b1490111b64b66209d4e647f13599d0
plan_head_after: 5edbd427c97978855a4dc5dedd36b4c5c648ee0f

tech-stack:
  added: []
  patterns:
    - "parseConfig throws ConfigError (key and fixed message per issue, schema order) so no module outside config-schema imports zod"
    - "Config is validated in register() with an explicit process.exit(1), never at module scope"
    - "check-env and smoke are Node-native scripts that CI and developers run the same way"

key-files:
  created:
    - src/server/config-startup.ts
    - src/instrumentation.ts
    - scripts/check-env.ts
    - scripts/smoke.ts
    - test/server/config.test.ts
    - test/server/config-startup.test.ts
    - test/scripts/check-env.test.ts
    - docs/adr/0010-app-env-app-url-and-startup-validation.md
  modified:
    - src/server/config-schema.ts
    - src/server/config.ts
    - .env.example
    - vitest.config.mts
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "ConfigError carries the issues instead of letting a ZodError escape, because ESLint (ADR 0009) forbids zod imports outside config-schema.ts and validation.ts"
  - "server-only works in the instrumentation layer, so the plan's fallback (parse process.env directly) was not used"
  - "APP_URL and each CORS_ORIGINS entry must equal their own URL origin exactly (no trailing slash, no path)"

patterns-established:
  - "Failing-assertion output in tests is kept to one line (joined strings) so the TAP evidence classifier can parse a RED report"

requirements-completed: [D4]

coverage:
  - id: D1
    description: "Starting the built app with an empty SESSION_SECRET exits 1 and names the key without printing any value"
    requirement: D4
    verification:
      - kind: unit
        ref: "test/server/config-startup.test.ts#[D4] writes none of the environment values to stderr"
        status: pass
      - kind: other
        ref: "npm run smoke (bad-env start exits 1, stderr names SESSION_SECRET, no MONGODB_URI value)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Schema boundaries: SESSION_SECRET 32/31 characters, timeout 100/30000 accepted and 99/30001 rejected, empty as missing, https in staging and production, APP_NOW only in development, test and ci"
    requirement: D4
    verification:
      - kind: unit
        ref: "test/server/config.test.ts (19 tests tagged [D4] and [S14])"
        status: pass
    human_judgment: false
  - id: D3
    description: "check:env fails on a missing or unknown .env.example key, a SECRET/KEY/PASSWORD NEXT_PUBLIC_ name, or a secret-named key with a value"
    requirement: S18
    verification:
      - kind: unit
        ref: "test/scripts/check-env.test.ts#[S18] reports a secret-named key that has a value"
        status: pass
      - kind: other
        ref: "npm run check:env on the repository prints check-env: ok"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI build job runs smoke against a mongo:8.0 service after a no-env build"
    requirement: S18
    verification:
      - kind: other
        ref: "Ruby YAML parse and grep of ci.yml; the same smoke command run locally"
        status: pass
      - kind: other
        ref: "First GitHub Actions run"
        status: unknown
    human_judgment: true
    rationale: "GitHub Actions cannot run here, and the mongo service health-check quoting is only proven by a runner"

duration: 25min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 04: Startup config validation Summary

**Zod config for every Phase 1 key is validated in `register()`: a bad or missing key stops `next start` with exit 1 and a stderr line naming the key (never the value), and `check:env` plus a built-app `smoke` run guard it in CI.**

## Performance

- **Duration:** about 25 min
- **Completed:** 2026-11-09
- **Tasks:** 2 of 2
- **Files modified:** 14 across the five commits

## Accomplishments

- `next start` with `SESSION_SECRET=` printed `Invalid configuration:` then `  - SESSION_SECRET: is required` and exited 1. `next build` passes with no environment.
- `server-only` works in the instrumentation layer: `config-startup.ts` imports it and `register()` runs under `next start`, so the Task 1 fallback was not used.
- `npm run smoke` printed `smoke: ok` against the local `docker compose` MongoDB. It was also seen failing when `SESSION_SECRET` was absent from the good run, and when MongoDB was unreachable (`/readyz` never 200).
- `check:env` returns no violations on the repository; 14 unit tests prove each rule, including that the violation message does not repeat the value.
- 82 tests pass (14 new for check-env, 19 for the schema, 6 for startup and `register()`).

## Task Commits

1. **Task 1 RED:** `6679f19` (test) - config and startup tests; 25 tests, 23 failing. TAP evidence for the S14 31-character case returned `RED_EVIDENCE_OK`.
2. **Task 1 GREEN:** `bd5df54` (feat) - schema, `config.ts`, `config-startup.ts`, `instrumentation.ts`, `.env.example`, Vitest env
3. **Task 1 follow-up:** `19b630c` (style) - Prettier on `config-schema.ts`, missed in the GREEN commit
4. **Task 2 RED:** `fd52857` (test) - check-env tests with a skeleton that returns no violations; 8 of 14 failing on assertions, `RED_EVIDENCE_OK`
5. **Task 2 GREEN:** `5edbd42` (feat) - `check-env`, `smoke`, npm scripts, CI, ADR 0010

**Plan metadata:** added in the final docs commit.

## Files Created/Modified

See the frontmatter lists. `vitest.config.mts` (the plan names `vitest.config.ts`, renamed by 01-03) gains `APP_URL` and a test-only `SESSION_SECRET` of more than 32 characters.

## Decisions Made

- **ConfigError, not ZodError.** The plan says `loadConfigOrExit` handles a `ZodError`, but `zod` is import-restricted to two files. `parseConfig` converts issues to `{ key, message }` sorted in schema order and throws `ConfigError`. Messages never include the received value.
- **Strict origins.** `APP_URL` and each `CORS_ORIGINS` entry must equal `new URL(x).origin`, so a trailing slash is rejected with a message saying "with no path".
- **`configKeys` export.** 01-03 un-exported `configSchema`. Rather than re-export the schema, `config-schema.ts` exports the key list, which `check-env` uses. It was left unexported in the Task 1 commit so knip stayed clean, and exported in Task 2.
- **CI mongo health check.** The plan gives `mongosh --eval "db.adminCommand('ping')"`. In the `options:` string it is written `--health-cmd "mongosh --quiet --eval 'db.adminCommand(\"ping\")'"`, which shell-splits to the intended single command.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] zod import restriction vs. handling ZodError**
- **Found during:** Task 1
- **Issue:** `config-startup.ts` cannot import `ZodError` under the ADR 0009 ESLint rule.
- **Fix:** `ConfigError` in `config-schema.ts` (see Decisions). ADR 0010 records it.
- **Files modified:** `src/server/config-schema.ts`, `src/server/config-startup.ts`
- **Committed in:** `bd5df54`

**2. [Rule 3 - Blocking] knip flagged `configKeys` as unused after Task 1**
- **Fix:** kept it module-private until Task 2 added the importer. **Committed in:** `bd5df54`, `5edbd42`

**3. [Rule 1 - Bug] Prettier drift in the Task 1 GREEN commit**
- **Issue:** a `sed` edit before the commit left `config-schema.ts` unformatted, and the check was piped through `tail` so the failure was missed.
- **Fix:** separate `style` commit `19b630c`. The GREEN commit `bd5df54` therefore fails `format:check` on its own; every later commit passes.

**4. RED skeletons.** The config-startup RED fails on a missing module (resolved at test run time through dynamic import, not at collection). The check-env RED uses a skeleton `scripts/check-env.ts` so the tests fail on assertions; its "real repository has no violations" test passes against the skeleton, so it only became meaningful at GREEN.

**Total deviations:** 3 auto-fixed (2 Rule 3, 1 Rule 1) plus the skeleton note. **Impact:** none beyond the 19b630c commit split.

## TDD Gate Compliance

RED then GREEN for both tasks (`test` commits `6679f19` and `fd52857` precede `feat` commits `bd5df54` and `5edbd42`). The project's commit format puts the plan last, so the gate's `feat(1-4):` grep will not match them; order is test then feat. RED evidence: `vitest --reporter=tap-flat` TAP reports, target `[S14] rejects a SESSION_SECRET of 31 characters` (expected `SESSION_SECRET`, got an empty string) and `[S18] reports a secret-named key that has a value` (expected one violation, got none), both `RED_EVIDENCE_OK`. Semantic assessment: each target ran and failed on its planned assertion, not on a load or syntax error. The classifier first returned `invalid_record` until failing-assertion output was one line, because multi-line array diffs broke its TAP parser; the tests were adjusted to compare joined strings. No REFACTOR commit.

## Issues Encountered

- A Bash call that deleted a glob in `/tmp` was refused by the permission classifier; the stray temporary file was not needed and was left alone.

## Requirements status

`requirements.ready-ids` returned `D4` ready; `S14` and `S18` blocked. Only D4 was marked complete. S14 and S18 are implemented here (32-character minimum, check-env) but are shared with later plans (session use of the secret in 01-09, plan 01-15's checks), so their status is unchanged.

## What could not be run

- **GitHub Actions.** `ci.yml` was parsed with Ruby, grepped for `npm run check:env`, `npm run smoke`, `mongo:8.0`, `openssl rand -base64 48` and `GITHUB_ENV`, and Prettier-checked. The commands themselves ran locally (see below). The `services: mongo` health check and the `$GITHUB_ENV` hand-off to the smoke step have not run on a runner.
- **Ran locally:** `typecheck`, `lint`, `lint:css`, `format:check`, `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage` (82 tests, thresholds met) and `build` all exit 0; `npm run smoke` printed `smoke: ok` with the local compose MongoDB.
- **Linux.** Everything ran on macOS.

## Next Phase Readiness

Plans that add config keys edit `config-schema.ts` and `.env.example` together; `check:env` fails otherwise. Plan 01-06 extends the second smoke run with header and CSP checks. Anything using the public origin should read `getConfig().appOrigin`.

## Self-Check: PASSED

All created files exist and commits `6679f19`, `bd5df54`, `19b630c`, `fd52857`, `5edbd42` are ancestors of HEAD.
