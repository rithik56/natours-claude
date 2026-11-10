# 0007. Regression tests are written with each feature

Status: Accepted
Date: 9 Nov 2026
Requirements: Q6, Q7
Plan review: DEL-02, QA-22

## Context

`plan.md` P1-RV1 and P1-RV2 write the regression and security tests for every route and action from the start of Phase 1, in `test/regression/` and `test/security/`, and say they "may fail until the matching feature lands". The Definition of Done also requires `npm test` to pass, and CI runs the tests on every push. Both cannot hold. DEL-02 (a Blocker) and QA-22 found that this makes the Definition of Done impossible for every other task. The reviewer role these tests belonged to does not exist under GSD (ADR 0002).

## Decision

Regression tests are written with each feature, in the plan that builds it, rather than up front in `test/regression/v1.test.ts`. Each test is tagged with the ID it proves, for example `[S14]` in the test name.

A final check in Phase 7 confirms that every S and B ID has a passing tagged test.

## Consequences

- `npm test` is green after every commit, so CI can run it on every push.
- A security or correctness requirement has no test until its feature exists. Coverage of the S and B families builds up phase by phase.
- Phase 7's check is what catches an ID that was never tested, so it must not be skipped.
