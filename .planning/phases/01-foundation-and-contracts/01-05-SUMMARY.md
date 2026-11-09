---
phase: 01-foundation-and-contracts
plan: 05
subsystem: infra
tags: [intl, ist, zod, pino, errors, messages]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-04 getConfig() with LOG_LEVEL and APP_NOW; plan 01-03 lint rules and check scripts"
provides:
  - "formatPrice, formatDate, formatDistance, rupeesToPaise in src/lib/format.ts (Indian grouping, IST, no server imports)"
  - "IST calendar-day helpers in src/lib/ist.ts: toIstDay, fromIstDay, addIstDays, isIstMidnight, isBookable (D-03), tripStatus (D-04), istMonthBounds"
  - "now() in src/server/clock.ts, the one clock, pinned by APP_NOW"
  - "messages in src/lib/messages.ts: errors per code and validation wording in Indian English"
  - "AppError, ERROR_CODES, ERROR_STATUS, isAppError for the 12 plan.md 4.2 codes"
  - "src/server/validation.ts: the only Zod entry point; installs the global error map; issuesToDetails and issuesToFieldErrors"
  - "pino logger with redaction: createLogger, getLogger, requestLogger, redactUrl; dev script pipes through pino-pretty"
affects: [01-06, 01-07, 01-08, 01-09, 01-10, 01-11, 01-12, 01-14, 01-15]

actuals:
  tokens: 10500
  tasks: 3
  commits: 6
plan_head_before: 1e5eb1aa982ed36205acbb0a7a7747f70c22043c
plan_head_after: 1f9247424d0ba86de46a149a2ac0269e8fde17ea

tech-stack:
  added: [pino@10.4.0, pino-pretty@13.2.0]
  patterns:
    - "Every schema imports z from @/server/validation so Zod's default English is never shown"
    - "Date helpers take now as an argument; only src/server/clock.ts reads the clock"
    - "Loggers take an injectable destination so tests capture real JSON lines"

key-files:
  created:
    - src/lib/format.ts
    - src/lib/ist.ts
    - src/lib/messages.ts
    - src/server/clock.ts
    - src/server/errors.ts
    - src/server/validation.ts
    - src/server/logger.ts
    - test/lib/format.test.ts
    - test/lib/ist.test.ts
    - test/server/clock.test.ts
    - test/server/errors.test.ts
    - test/server/validation.test.ts
    - test/server/logger.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "A pinned APP_NOW with no offset (date-only or local date-time) is read as India Standard Time, not the server's zone"
  - "requestLogger takes an optional second argument, the base logger, so tests can capture lines; the default is the root logger"
  - "A string too_small with a minimum of 1 maps to the required message, so an empty non-empty string reads 'Fill in this field.'"
  - "User-facing wording avoids the word 'expected' because the plan's test forbids Zod's default phrasing"

patterns-established:
  - "Vitest assertion messages that contain an apostrophe print \\' in TAP and make the report malformed for the RED classifier; run the target test alone with -t to get clean evidence"

requirements-completed: [B19, B20, B9, D7, S3]

coverage:
  - id: D1
    description: "formatPrice gives rupees with Indian grouping (₹1,24,999) and rejects non-integer or non-positive input; rupeesToPaise never rounds"
    requirement: B20
    verification:
      - kind: unit
        ref: "test/lib/format.test.ts (6 tests tagged [B20])"
        status: pass
    human_judgment: false
  - id: D2
    description: "formatDate and the IST helpers give the IST day on a UTC process, write Sep not Sept, and implement isBookable (D-03) and tripStatus (D-04) at the day boundaries"
    requirement: B19
    verification:
      - kind: unit
        ref: "test/lib/format.test.ts and test/lib/ist.test.ts (19 tests tagged [B19], run with TZ=UTC)"
        status: pass
      - kind: unit
        ref: "test/server/clock.test.ts (4 tests: APP_NOW with offset, date-only, no offset, unset)"
        status: pass
    human_judgment: false
  - id: D3
    description: "AppError maps the 12 codes to the plan.md 4.2 statuses with default text from messages.ts; Zod issues take their text from messages.ts"
    requirement: B9
    verification:
      - kind: unit
        ref: "test/server/errors.test.ts and test/server/validation.test.ts (23 tests tagged [B9])"
        status: pass
    human_judgment: false
  - id: D4
    description: "Log lines are JSON with requestId on every line, and password, token, cookie, authorization and stripe-signature values are written as [redacted]"
    requirement: S3
    verification:
      - kind: unit
        ref: "test/server/logger.test.ts (12 tests tagged [D7] or [S3])"
        status: pass
    human_judgment: false
  - id: D5
    description: "The wording in messages.ts is in Indian English, says what happened and how to fix it, and does not apologise"
    verification:
      - kind: unit
        ref: "test/server/errors.test.ts#messages voice (checks sentence ending, apology words, exclamation, American spellings)"
        status: pass
    human_judgment: true
    rationale: "Tests catch banned words and spelling, not whether each sentence reads well; Phase 2's copy.md rewords this file"

duration: about 40min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 05: Shared libraries Summary

**Indian price and date formatting with IST calendar-day logic, one clock, central wording, `AppError` with the 12 codes, a Zod entry point that hides Zod's English, and a pino logger that redacts secrets and tags every line with a request ID.**

## Performance

- **Duration:** about 40 min (start time was not recorded, so this is an estimate)
- **Completed:** 2026-11-09
- **Tasks:** 3 of 3
- **Files modified:** 15 across the six task commits (13 created, `package.json` and `package-lock.json` modified)

## Accomplishments

- `formatPrice(124999)` is `₹1,24,999`; `formatDate` of `2026-12-31T18:30:00Z` is `1 Jan 2027` with `process.env.TZ` asserted to be `UTC`; September is `Sep`.
- `isBookable` is true at 20 Nov 2026 23:59:59 IST and false at 21 Nov 00:00 IST for the Meghalaya departure; `tripStatus` flips from `upcoming` to `past` at 00:00 IST on 26 Nov for its 5-day trip.
- `new AppError('CONFLICT')` is 409 with the `messages.ts` text; the status map matches plan.md 4.2 exactly. A strict schema with no custom messages yields only `messages.validation` text.
- Logging a body with passwords, tokens, cookie, authorization and stripe-signature writes each as `[redacted]`; `redactUrl('/reset-password/abc123?x=1')` is `/reset-password/[redacted]?x=1`.
- 155 tests pass across 14 files (73 new in this plan); `src/lib` imports nothing from `src/server` and has no `server-only`.

## Task Commits

1. **Task 1 RED:** `f96d72c` (test) - 38 tests, 33 failing against a skeleton; `RED_EVIDENCE_OK`
2. **Task 1 GREEN:** `2710201` (feat) - `format.ts`, `ist.ts`, `clock.ts`
3. **Task 2 RED:** `fa624fa` (test) - 23 tests, 16 failing; `messages.ts` is data and landed whole here; `RED_EVIDENCE_OK`
4. **Task 2 GREEN:** `ed7d0d2` (feat) - `errors.ts`, `validation.ts`, two `messages.ts` rewordings
5. **Task 3 RED:** `0391c0d` (test) - 12 tests, 11 failing against a skeleton logger; `RED_EVIDENCE_OK`
6. **Task 3 GREEN:** `1f92474` (feat) - `logger.ts`, pino 10.4.0, pino-pretty 13.2.0, `dev` script

**Plan metadata:** added in the final docs commit.

## Files Created/Modified

See the frontmatter lists. `package.json` also changes `dev` to `next dev | pino-pretty`.

## Decisions Made

- **APP_NOW is IST when it has no offset.** The plan says `new Date(APP_NOW)`. A date-only value would then be UTC midnight and a local date-time would depend on the server's zone. `clock.ts` reads `2026-11-21` as 00:00 IST and `2026-11-21T09:30:00` as 09:30 IST. Values with `Z` or an offset are used as given.
- **`requestLogger(requestId, base = getLogger())`.** The pino default destination is a file descriptor, so a test cannot spy on `process.stdout.write`. The optional second argument lets a test pass a logger that writes to a capture stream. Callers in later plans pass only the ID.
- **Empty string reads as required.** A string `too_small` with a minimum of 1 or less maps to `validation.required`, because "Use at least 1 characters." is not something to show.
- **Wording avoids "expected".** The plan's test for "no Zod default text" looks for that word, so `invalidType` and `invalidFormat` say "isn't in the right form/format".
- **Exact pins.** pino and pino-pretty were installed with `--save-exact`, matching the other runtime dependencies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Own wording tripped the plan's "no Zod default text" test**
- **Found during:** Task 2 GREEN
- **Issue:** `invalidType` and `invalidFormat` in `messages.ts` contained "expected", which the test treats as Zod default text.
- **Fix:** reworded both to "in the right form" and "in the right format".
- **Files modified:** `src/lib/messages.ts`
- **Verification:** `test/server/validation.test.ts` passes; the plan's `grep -cE "Sorry|Oops|!'"` returns 0.
- **Committed in:** `ed7d0d2`

**2. [Rule 3 - Blocking] `security/detect-unsafe-regex` warning in `clock.ts`**
- **Found during:** Task 1 GREEN gates (`npm run lint` exits 1 on any warning)
- **Issue:** the first version used a nested-quantifier regex to recognise a date-time with no offset.
- **Fix:** detect the offset (`Z` or `+hh:mm`) instead, and treat everything else as IST.
- **Files modified:** `src/server/clock.ts`
- **Committed in:** `2710201` (the regex was never committed)

**3. TDD skeletons.** Each RED commit includes a skeleton source file whose functions return neutral wrong values, so tests fail on assertions rather than on a missing module. Some tests pass against a skeleton (for example `isBookable` returning false when the test expects false) and only become meaningful at GREEN. `messages.ts` is pure data, so it was written whole in the Task 2 RED commit.

**Total deviations:** 2 auto-fixed (1 Rule 1, 1 Rule 3) plus the skeleton note. **Impact:** none on scope.

## TDD Gate Compliance

RED then GREEN for all three tasks (`test` commits `f96d72c`, `fa624fa`, `0391c0d` precede `feat` commits `2710201`, `ed7d0d2`, `1f92474`). The project's commit format puts the plan last, so the gate's `feat(1-5):` grep will not match them; order is test then feat. No REFACTOR commit.

RED evidence (`vitest --reporter=tap-flat`, classifier `gsd-tools check tdd-red-evidence`), all `RED_EVIDENCE_OK`:

- Task 1: target `formatPrice > [B20] groups the Indian way: lakhs after the first three digits`, expected `₹1,24,999`, got an empty string. Semantic assessment: the target ran and failed on its planned assertion against a skeleton that returns `''`.
- Task 2: target `error codes > [B9] maps each code to the status in plan.md 4.2 and nothing else` (run with `errors.test.ts` alone), expected the 12 `CODE:status` pairs, got an empty string. A second record for `validation.test.ts -t "gives string and number bounds"` expected `Use at least 3 characters.` and got Zod's default text.
- Task 3: target `requestLogger > [D7] writes one JSON line with requestId, level, time and msg` (run with `-t`), expected 1 line, got 0.

The first Task 2 and Task 3 reports were `INVALID_RED / invalid_record`: when an assertion message contains an apostrophe (`isn\'t` in a user-facing string, or an object with functions), the TAP YAML is malformed. The target tests were re-run alone, which the reference allows, rather than editing the report.

## Issues Encountered

- A BSD `sed -i` with `;` failed silently inside a gate loop, so a first Task 2 gate run showed one failing test and `test:coverage` exit 1; the edit was redone with the Edit tool and all gates re-run clean.

## Known Stubs

None. The RED skeletons were all replaced at GREEN.

## User Setup Required

None - no external service configuration required.

## Gates run

All exit 0 after the final commit `1f92474`: `typecheck`, `lint`, `lint:css`, `format:check`, `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage`, `build`. `npm test` shows 155 passed. The same gates also passed before each GREEN commit. GitHub Actions cannot run here, so no CI step was run on a runner. The `next dev | pino-pretty` pipeline was checked only by piping one sample log line through the `pino-pretty` binary, not by running `next dev`.

## Next Phase Readiness

- Import `z` from `@/server/validation`, never from `zod`. New user-facing text goes in `src/lib/messages.ts`.
- Pass `now()` from `@/server/clock` into `isBookable`, `tripStatus` and `toIstDay`; the helpers never read the clock.
- Throw `AppError(code)` with a code from `ERROR_CODES`. Do not put driver or Mongoose text in an `AppError` message (T-01-17); the mapper in plan 01-11 enforces it.
- Log with `requestLogger(requestId)`. Put URLs through `redactUrl` before logging them; pino's `redact` covers object fields only, not URL strings.
- `formatPrice` rejects 0; a free item would need its own wording.

## Self-Check: PASSED

All created files exist and commits `f96d72c`, `2710201`, `fa624fa`, `ed7d0d2`, `0391c0d`, `1f92474` are ancestors of HEAD.
