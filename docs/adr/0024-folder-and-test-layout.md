# 0024. Folder and test layout

Status: Accepted
Date: 9 Nov 2026
Requirements: Q6, Q7
Plan review: ARC-24, QA-23, QA-17

## Context

`plan.md` 3.3 sketches the folder layout, and Q6 sets coverage thresholds. The plan review found gaps in both:

- ARC-24: the layout is missing files the plan itself uses, such as `src/server/cache.ts`, `docs/bundle-baseline.json`, the check scripts for S18 and D4, the Vitest config that holds the Q6 thresholds, and knip.
- QA-23: Q6 does not say which files count towards its coverage thresholds. By default Vitest counts only files imported during the run, so an untested file never lowers the percentage, and the real adapters, which Q7 means never run in tests, would count as uncovered. The plan also does not say whether the 85% target for services is per file or overall.
- QA-17: test factories need to import models, which the layering rules forbid elsewhere (ADR 0009).

CONTEXT also left open where the ID-tagged regression tests live: with their feature tests, or in a `test/regression/` index.

## Decision

This is the layout as built at the end of Phase 1.

**Source**

- `src/app/`: routes. Phase 1 has `layout.tsx`, `page.tsx` and the `/healthz` and `/readyz` Route Handlers (ADR 0006).
- `src/lib/`: modules that either side may import: `format.ts`, `ist.ts` and `messages.ts`.
- `src/server/`: server-only code. Shared modules sit at the top level: `config.ts`, `config-schema.ts`, `config-startup.ts`, `schema-helpers.ts`, `validation.ts`, `error-mapper.ts`, `errors.ts`, `access.ts`, `roles.ts`, `clock.ts`, `deps.ts`, `db.ts`, `logger.ts`, `redirects.ts` and `session.ts`.
- `src/server/adapters/`: every outside-world adapter and its fake: `mailer`, `queue`, `storage`, `stripe`, `rate-limit` and `cache`, with `real-cache.ts` beside them. This replaces the separate `queue`, `storage`, `stripe` and `mailer` folders of `plan.md` 3.3 and the single `src/server/cache.ts` (ADR 0016).
- `src/server/api/`: `with-api.ts`, `responses.ts`, `parse-query.ts` and `origin.ts`.
- `src/server/actions/`: `action.ts` and `action-state.ts`.
- `src/server/modules/<name>/`: one folder per model, with `model.ts`, `dto.ts` and, once a feature needs it, `service.ts`. Phase 1 has `users`, `tours`, `reviews` and `bookings`.
- `src/proxy.ts` and `src/instrumentation.ts` at the top of `src/`.

**Tests**

- Tests mirror `src/` under `test/`: `test/server/modules/users/model.test.ts` tests `src/server/modules/users/model.ts`, and `test/lib/ist.test.ts` tests `src/lib/ist.ts`.
- **Tagged regression tests sit beside their feature tests,** with the ID in the test name, for example `it('[S14] ...')` in `test/server/session.test.ts`. There is no `test/regression/v1.test.ts` (ADR 0007).
- `test/examples/` holds the three example tests later phases copy: a Server Action, a page data function and one service behind both a Route Handler and an action.
- `test/helpers/` holds `factories.ts`, `call-route.ts`, `mock-session.ts`, `fakes.ts`, `db.ts`, `seed.ts` and `request-context.ts`. `test/setup.ts` and `test/global-setup.ts` start the one in-memory MongoDB, give each file its own database and reset the fakes before each test.
- The factories take their data from `seed/data/*.json` and take an options object, not the positional arguments of `plan.md` 4.5 (D-08). `docs/contracts.md` section 9 lists them.
- `test/scripts/` tests the check scripts and `test/tooling/` tests the ESLint rules.

**Tooling files**

- `scripts/`: `check-client-boundaries.ts`, `check-conventions.ts`, `check-env.ts`, `smoke.ts` and `measure-bundle.ts`.
- `vitest.config.mts` holds the coverage thresholds. It is `.mts` because Vite warned about ESM syntax in a `.ts` config in a project that was then CommonJS (ADR 0009).
- `knip.json`, `lighthouserc.cjs` and `docs/bundle-baseline.json` (ADR 0018).

**Coverage (QA-23, Q6)**

- `coverage.include` is `src/server/**/*.ts`. Pages and Route Handlers under `src/app/` and the shared code under `src/lib/` are not counted. The tests exercise them, but they are not part of the threshold.
- `coverage.exclude` is `src/server/adapters/real-*.ts`. The real adapters never run in tests (Q7), and the production build proves they compile.
- The threshold is 75% of lines overall.
- Every `src/server/modules/**/service.ts` must have 85% of lines on its own (`perFile: true`).
- `config.ts` is not excluded, unlike QA-23's proposal, because the config tests cover it.

## Consequences

- A new service is held to 85% from its first commit, and a new real adapter named `real-*.ts` is excluded without a config change. An adapter that does not follow that name counts as uncovered and will fail the threshold.
- A new module follows the `src/server/modules/<name>/` layout and gets its mirror under `test/server/modules/<name>/`.
- ARC-24's other missing files are added by the phases that build them: `playwright.config.ts`, the OpenAPI file and its lint step, `.dockerignore`, the media route, the worker's `src/worker/empty.ts` and the credits page.
- Because tagged tests live with their features, finding every test for one ID needs a search for the tag. Phase 7's check that every S and B ID has a passing tagged test (ADR 0007) does that search.
