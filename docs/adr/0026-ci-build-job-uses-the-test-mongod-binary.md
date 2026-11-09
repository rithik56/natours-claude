# 0026. The CI build job runs MongoDB from the test binary

Status: Accepted
Date: 9 Nov 2026
Requirements: Q2, S18
Plan review: none

## Context

The `build` job in `.github/workflows/ci.yml` first used a `services: mongo` container (`mongo:8.0`) so that `smoke` and `bundle:check` had a real database. The first GitHub Actions run (run id 42652817012, branch `gsd/phase-01-foundation-and-contracts` at commit 028ff19) failed in that job at "Initialize containers". The container went unhealthy, and MongoDB logged `MongoDB cannot start: Linux kernel versions 6.19 and newer has a known incompatibility with this version of MongoDB (SERVER-121912)`. None of the job's steps ran, so `next build`, `smoke` and `bundle:check` have not yet run on a runner.

In the same run the `checks` job passed every step on the same kind of runner, including `npm run test:coverage` with the in-memory `mongod` 8.0.34 that `package.json` pins under `config.mongodbMemoryServer`. So that binary starts there.

SERVER-121912 is titled "Upgrade tcmalloc to include rseq bug fix". Its Jira ticket is Closed with the resolution "Gone away" and records no fix version, so there is no documented image tag to move to. Guessing a tag was ruled out.

## Decision

- **The `build` job no longer has a `services:` block.** A new step, "Start MongoDB from the test binary", runs `npm run ci:mongo` in the background and waits for `127.0.0.1:27017` to accept connections, trying once a second for up to 60 seconds. If it never does, the step fails and prints the script's log.
- **`scripts/ci-mongo.ts` starts a `MongoMemoryServer`** on `127.0.0.1` only, on the port in `CI_MONGO_PORT` (default 27017). It takes its binary version from the same `package.json` setting as `test/global-setup.ts`, so there is one version number. It prints one readiness line and stops its `mongod` on SIGINT and SIGTERM. The port parsing is a pure function, `parseMongoOptions`, with a unit test.
- **Every later step and its environment is unchanged.** `smoke` and `bundle:check` still use `MONGODB_URI=mongodb://127.0.0.1:27017/natours`. The `checks` job is untouched.

## Consequences

- CI's `smoke` and `bundle:check` now run against the downloaded `mongod` 8.0.34 binary, not the `mongo:8.0` container image. CI therefore no longer exercises that image or `docker-compose.yml`. Local development still uses the compose file, and it still works on a Mac.
- The `build` job downloads the binary on each run, as `checks` already does.
- **Not verified:** that the new `build` job works on GitHub. Locally the script was run on port 27018, answered a ping and exited cleanly on SIGTERM and SIGINT with no `mongod` left behind, and `npm run smoke` passed against it. The workflow YAML parses and the step's shell was run locally. Until a GitHub Actions run passes, the step, the background process hand-off between steps and `bundle:check` with Chrome remain unconfirmed.
- **Revisit** when MongoDB documents a fixed image or the runner kernel changes. Then try a `services: mongo` container again and, if it works, remove `scripts/ci-mongo.ts`, the `ci:mongo` script and this step. That change needs a new ADR that supersedes this one.
