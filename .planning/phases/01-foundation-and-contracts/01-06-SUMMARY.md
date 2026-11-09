---
phase: 01-foundation-and-contracts
plan: 06
subsystem: infra
tags: [csp, nonce, proxy, security-headers, nextjs, smoke]

requires:
  - phase: 01-foundation-and-contracts
    provides: "Plan 01-04 scripts/smoke.ts and getConfig(); the skeleton root layout with await connection()"
provides:
  - "src/proxy.ts: per-request nonce CSP with strict-dynamic and a fresh x-request-id on every page request"
  - "next.config.ts: HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options DENY and poweredByHeader false on every response"
  - "scripts/smoke.ts: built-app proof that every script tag carries the nonce from its own response's CSP"
  - "ADR 0011 (style-src-attr for next/image, Stripe form-action) and ADR 0012 (unstable_cache adapter, Cache Components off, dynamic rendering)"
affects: [01-10, 01-11, 01-13, 01-14, 01-15]

actuals:
  tokens: 5500
  tasks: 2
  commits: 3
plan_head_before: 5e3cf3b6407fc43ebc88230fb52d8f17d9ea2f8f
plan_head_after: cec54a5188bbcbda1ceb1c4f6fb19d2bc1db153d

tech-stack:
  added: []
  patterns:
    - "Request headers x-nonce, x-request-id and content-security-policy are set on the forwarded request so Next reads the nonce while rendering"
    - "The proxy reads process.env directly and imports nothing from src/server (ARC-26)"

key-files:
  created:
    - src/proxy.ts
    - test/proxy.test.ts
    - test/next-config.test.ts
    - docs/adr/0011-csp-style-attributes-for-next-image.md
    - docs/adr/0012-tagged-data-cache-and-dynamic-rendering.md
  modified:
    - next.config.ts
    - scripts/smoke.ts

key-decisions:
  - "The matcher test checks the planned source string and then tests paths against a literal copy of it, because security/detect-non-literal-regexp rejects building a RegExp from the config string"
  - "upgrade-insecure-requests keys off process.env.APP_ENV (staging or production), not NODE_ENV, as ADR 0010 requires"

patterns-established:
  - "Smoke checks fetch the built app twice to prove nonces differ, then compare each script tag with the nonce parsed from the CSP header"

requirements-completed: [S11, D7]

coverage:
  - id: D1
    description: "Every page response carries a CSP with a per-request nonce, strict-dynamic and no unsafe-inline in script-src; unsafe-eval only in development; fixed directive set with no wildcard source"
    requirement: S11
    verification:
      - kind: unit
        ref: "test/proxy.test.ts (7 tests tagged [S11], including 50 concurrent distinct nonces and a deterministic policy apart from the nonce)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every script tag on the built app's home page carries the nonce from that response's CSP, and two requests get different nonces"
    requirement: S11
    verification:
      - kind: integration
        ref: "npm run smoke against next start on a production build (output: smoke: ok)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A client-supplied x-request-id is overwritten with a server UUID on the response and the forwarded request headers"
    requirement: D7
    verification:
      - kind: unit
        ref: "test/proxy.test.ts (3 tests tagged [D7])"
        status: pass
    human_judgment: false
  - id: D4
    description: "Static security headers on every response; /readyz has them and no CSP because the proxy matcher skips it"
    requirement: S11
    verification:
      - kind: unit
        ref: "test/next-config.test.ts (2 tests) and test/proxy.test.ts matcher tests"
        status: pass
      - kind: integration
        ref: "npm run smoke (checkProbeHeaders)"
        status: pass
    human_judgment: false
  - id: D5
    description: "ADRs 0011 and 0012 record the style-attribute exception and the cache and dynamic-rendering decision"
    verification:
      - kind: other
        ref: "ADR structure check from the plan (Status: Accepted, Decision, Consequences, style-src-attr, unstable_cache)"
        status: pass
    human_judgment: true
    rationale: "Tests check structure only; whether the reasoning reads clearly is for the reviewer"

duration: about 25min
completed: 2026-11-09
status: complete
---

# Phase 1 Plan 06: Browser security layer Summary

**A nonce-based CSP with `'strict-dynamic'` and a server-minted request ID from `src/proxy.ts`, static security headers from `next.config.ts`, and a smoke check that proves on the production build that every script tag carries its own response's nonce.**

## Performance

- **Duration:** about 25 min (start time was not recorded, so this is an estimate)
- **Completed:** 2026-11-09
- **Tasks:** 2 of 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- `GET /` on `next start` returns a CSP whose `script-src` is `'self' 'nonce-…' 'strict-dynamic'`; all 9 script tags in the HTML carry that nonce, two requests get different nonces, `x-request-id` is a UUID, and `/readyz` has the security headers and no CSP. `npm run smoke` prints `smoke: ok`, and the bad-env (empty `SESSION_SECRET`) run still exits 1.
- The proxy overwrites a client `x-request-id` of `attacker-value` with a UUID on the response and on the forwarded request, which also carries `x-nonce` and the policy.
- Fifty concurrent proxy calls give fifty distinct nonces; apart from the nonce the policy string is identical across requests; no source is `*` or `*.…`, and the only non-self host is `https://checkout.stripe.com`.
- `next build` lists `ƒ Proxy (Middleware)` and `/` as dynamic (`ƒ`), confirming the root layout's `await connection()` keeps it per request.

## Task Commits

1. **Task 1 RED:** `acf5624` (test) - 15 tests across `test/proxy.test.ts` and `test/next-config.test.ts`; `RED_EVIDENCE_OK`
2. **Task 1 GREEN:** `591aeef` (feat) - `src/proxy.ts`, `next.config.ts`, matcher test adjusted for lint
3. **Task 2:** `cec54a5` (test) - smoke extension, ADRs 0011 and 0012

**Plan metadata:** added in the final docs commit.

## Files Created/Modified

See the frontmatter lists. `scripts/smoke.ts` gains `checkPage` (CSP, nonce on every script tag, request ID, security headers), `checkProbeHeaders` (`/readyz`) and a two-request nonce comparison.

## Decisions Made

- **Matcher test.** `security/detect-non-literal-regexp` blocks `new RegExp(source)`. The test asserts the exported `source` equals the planned string and exercises paths against a literal regular expression of the same pattern, so a drift in either breaks a test.
- **`upgrade-insecure-requests`** is read from `process.env.APP_ENV` at request time, so the smoke run (`APP_ENV=ci`, http) is unaffected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lint warning on the matcher test**
- **Found during:** Task 1 GREEN gates (`npm run lint` exits 1 on any warning)
- **Issue:** building `new RegExp` from the matcher `source` raised `security/detect-non-literal-regexp`.
- **Fix:** replaced it with the literal-pattern approach above. This edit to `test/proxy.test.ts` is in the GREEN commit, not the RED commit.
- **Files modified:** `test/proxy.test.ts`
- **Committed in:** `591aeef`

**2. TDD stub, not committed.** The RED run needed `@/proxy` to exist so tests fail on assertions instead of an import error. A throwaway `src/proxy.ts` returning a bare `NextResponse.next()` was used for the RED run and left out of the RED commit, so `acf5624` on its own does not typecheck (it imports a file that lands in `591aeef`). Plan 01-05 committed skeletons in RED instead; either way the GREEN commit is the first one that passes the full gate suite.

**Total deviations:** 1 auto-fixed (Rule 3) plus the stub note. **Impact:** none on scope.

## TDD Gate Compliance

`test` commit `acf5624` precedes `feat` commit `591aeef`. No REFACTOR commit. Task 2 is not a TDD task. The project's commit format puts the plan last, so the gate's `feat(1-6):` grep will not match; order is test then feat.

RED evidence (`vitest --reporter=tap-flat`, classifier `gsd-tools check tdd-red-evidence`), both `RED_EVIDENCE_OK`, each with the target test run alone via `-t`:

- Target `proxy content security policy > [S11] script-src carries the nonce, strict-dynamic and self, and never unsafe-inline`: expected a `content-security-policy` header, got none. Semantic assessment: the target ran against a proxy that sets no headers and failed on the planned behaviour.
- Target `next.config security headers > [S11] adds the static security headers to every path`: expected one headers rule for `/:path*`, got none. Semantic assessment: the target ran against an empty config and failed on the planned assertion.

With the stub, 14 of 15 tests failed; the matcher test for skipped paths passed because the stub's source matched only `/`, so it is only meaningful at GREEN.

## Issues Encountered

- No difference between the plan and the installed Next 16.4.5 API: `src/proxy.ts` with `export function proxy`, the `matcher` object form with `missing`, and the nonce flow all match `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` and the proxy file-convention page.
- A first loop over the gates read `$?` after `echo`, which hid exit codes; the gates were re-run one by one with their own exit codes.

## Known Stubs

None. The RED stub was never committed and `src/proxy.ts` is the real implementation.

## Threat Flags

None. The only new surface is the CSP and headers this plan was written to add.

## User Setup Required

None - no external service configuration required.

## Gates run

All exit 0 after the final task commit `cec54a5`: `typecheck`, `lint`, `lint:css`, `format:check`, `check:client`, `check:conventions`, `check:env`, `knip`, `test:coverage`, `build`. `npm run smoke` (after `docker compose up -d --wait mongo` and a fresh `npm run build`, with `APP_ENV=ci APP_URL=http://localhost:3210`) printed `smoke: ok`. The same gates, except `smoke`, passed before the GREEN commit. GitHub Actions cannot run here, so no CI step was run on a runner. Not checked: `next dev` behaviour of `'unsafe-eval'` (unit-tested with a stubbed `NODE_ENV`), and `upgrade-insecure-requests` on a real https staging host (unit-tested with a stubbed `APP_ENV`).

## Next Phase Readiness

- CI's smoke step needs MongoDB and the same environment as in the plan's verify command; the new checks add no environment keys.
- Phase 4 adds map-tile and storage hosts to `img-src` in `src/proxy.ts` after the D14 ADR. Do not use a wildcard source, which a test forbids.
- Routes under `/api`, `/webhooks`, `/healthz` and `/readyz` bypass the proxy: they get the static headers but no CSP and no proxy request ID, so `withApi` (plan 01-11) must mint its own (ARC-18).
- Removing `await connection()` from the root layout breaks the smoke check; that is intended.

## Self-Check: PASSED

All created files exist and commits `acf5624`, `591aeef`, `cec54a5` are ancestors of HEAD.
