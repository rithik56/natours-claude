# Natours v2

Natours v2 is a from-scratch rebuild of Natours, a tour-booking web app, as a full-stack Next.js 16 application with 13 small-group tours across India, priced in rupees. `plan.md` is the specification, and `docs/adr/` records every decision that departs from it.

This is the Phase 1 state of the project: the foundation that every feature builds on. It has one page (`/`), the `/healthz` and `/readyz` routes, four data models, sessions, the request pipeline, test fakes and the CI quality gates. Tours, accounts and bookings arrive in later phases.

## Prerequisites

- Node.js 24. On macOS, run `brew install node@24` and put `/opt/homebrew/opt/node@24/bin` first on your `PATH`. Check it with `node --version`, which must print v24.15 or later in the 24 line. `.npmrc` sets `engine-strict=true`, so `npm ci` refuses to install under any other major version.
- Docker Desktop, for the local MongoDB. The tests do not need it.
- A network connection for the first test run, which downloads a MongoDB binary.

## Quick start

1. Install the dependencies: `npm ci`
2. Create your local environment file: `cp .env.example .env.local`
3. Give it a session secret. `SESSION_SECRET` is empty in `.env.example` and the app refuses to start without it. This command writes a random 48-character one into `.env.local`:
   ```sh
   node -e "const fs=require('fs');const s=require('crypto').randomBytes(36).toString('base64');fs.writeFileSync('.env.local',fs.readFileSync('.env.local','utf8').replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+s))"
   ```
   You can also run `openssl rand -base64 48` and paste the result after `SESSION_SECRET=`. The other keys that are empty, `CORS_ORIGINS` and `APP_NOW`, can stay empty: an empty `CORS_ORIGINS` allows no cross-origin browser callers, and an empty `APP_NOW` leaves the clock unpinned.
4. Start MongoDB and wait until it is healthy: `docker compose up -d --wait mongo`
5. Start the app: `npm run dev`
6. Open http://localhost:3000 for the home page.
   - http://localhost:3000/healthz answers `{"status":"ok"}`. It never touches the database.
   - http://localhost:3000/readyz answers 200 when MongoDB is reachable and 503 when it is not.

To run the production build instead of the development server, run `npm run build` and then `npm run start`. Both read `.env.local`.

To stop MongoDB, run `docker compose down`. Its data stays in a Docker volume.

If a key is missing or invalid, the app exits at start-up and names the key. It never prints a value.

## Scripts

| Script | Command | What it does |
| --- | --- | --- |
| `dev` | `npm run dev` | Starts the development server, with its JSON logs pretty-printed. |
| `build` | `npm run build` | Builds for production. It needs no environment variables. |
| `start` | `npm run start` | Serves the production build. |
| `lint` | `npm run lint` | ESLint with zero warnings allowed. |
| `lint:css` | `npm run lint:css` | stylelint on `src/**/*.css`. It passes with no CSS files until Phase 3. |
| `format` | `npm run format` | Prettier rewrites the files. |
| `format:check` | `npm run format:check` | Prettier only checks. It skips Markdown, `seed/` and `.planning/` (ADR 0009). |
| `typecheck` | `npm run typecheck` | `tsc --noEmit` in strict mode. |
| `knip` | `npm run knip` | Reports unused files, exports and dependencies. |
| `check:client` | `npm run check:client` | Fails a `'use client'` file with no `// client: <reason>` line, and a client file that imports server-only code (R2, R6). |
| `check:conventions` | `npm run check:conventions` | Kebab-case file names, issue-linked TODO and FIXME comments, no commented-out code, `server-only` first in `src/server` (ADR 0009). |
| `check:env` | `npm run check:env` | Every config key is in `.env.example`, no secret-named key has a value, and no `NEXT_PUBLIC_` name contains SECRET, KEY or PASSWORD (S18, ADR 0010). |
| `test` | `npm test` | Runs the Vitest suite once. |
| `test:coverage` | `npm run test:coverage` | Runs it with coverage and the thresholds. |
| `smoke` | `npm run smoke` | Starts the built app twice, once with a bad `SESSION_SECRET` and once with a good environment, and checks the exit, the headers and the CSP nonce. |
| `ci:mongo` | `npm run ci:mongo` | Starts MongoDB from the test binary on `127.0.0.1`, port `CI_MONGO_PORT` (default 27017), until stopped. CI's `build` job uses it (ADR 0026). |
| `lhci:collect` | `npm run lhci:collect` | Runs Lighthouse CI three times against `next start` on port 3300. |
| `bundle:record` | `npm run bundle:record` | Collects, then rewrites `docs/bundle-baseline.json`. Run it locally and commit the result (ADR 0018). |
| `bundle:check` | `npm run bundle:check` | Collects, then fails if the script size of `/` is over the recorded floor plus 40 KB. CI runs this one. |

`smoke` and the two bundle scripts need a fresh `npm run build`, a reachable MongoDB and these variables set in the shell:

```sh
APP_ENV=ci APP_URL=http://localhost:3210 MONGODB_URI=mongodb://127.0.0.1:27017/natours SESSION_SECRET="$(openssl rand -base64 48)" npm run smoke
```

For `bundle:check`, use `APP_URL=http://localhost:3300`. The Lighthouse scripts also need Google Chrome installed.

## Architecture

There are three ways in: pages, Server Actions and Route Handlers. All three go through services to the models. Business rules live in services only, so the same rule serves a page, an action and an API route.

```text
page  ─┐
action ┼─►  service  ─►  model  ─►  MongoDB
route ─┘      │
              └─►  adapters (mail, queue, storage, Stripe, rate limit, cache)
```

A request meets these layers in order:

1. `src/proxy.ts` gives page and action requests a fresh request ID and a Content-Security-Policy with a per-request nonce. Routes under `/api`, `/webhooks`, `/healthz` and `/readyz` bypass it.
2. `withApi` (Route Handlers) or `action()` (Server Actions) runs the fixed pipeline: request ID, origin check on writes, access, validation, rate limit, then your handler. Both require an explicit `access` declaration, and a route that declares none is refused.
3. `getCurrentUser()` resolves the user. It reads the user and the role from the database on every request, because the session token carries no role.

Adapters sit behind interfaces. Development, test and CI use fakes, and staging and production refuse to start an adapter that has no real implementation yet (ADR 0016). Pages render per request, never from a build-time cache (ADR 0012).

Read `plan.md` section 3 for the full design, and [`docs/contracts.md`](docs/contracts.md) for the exact signatures as built.

```text
src/app/          routes: /, /healthz, /readyz
src/lib/          format.ts, ist.ts and messages.ts, importable from anywhere
src/server/       server-only code: config, session, errors, adapters, api, actions, modules
src/proxy.ts      request ID and CSP nonce
test/             mirrors src/, plus helpers/, examples/ and scripts/
scripts/          the check scripts, the smoke script and the bundle script
docs/             contracts.md, adr/, bundle-baseline.json and the plan review
seed/             the real content the app starts with
```

## Configuration

Configuration comes from environment variables, validated at start-up by `src/server/config-schema.ts`. Copy `.env.example` to `.env.local` for development. Secrets go in `.env.local` and never in git: `.gitignore` excludes every `.env*` file except `.env.example`, and `npm run check:env` fails if a secret-named key in `.env.example` has a value.

| Key | Meaning |
| --- | --- |
| `APP_ENV` | Required. `development`, `test`, `ci`, `staging` or `production`. |
| `APP_URL` | Required. The public origin, with no path. It must be `https` in staging and production. |
| `MONGODB_URI` | Required. The MongoDB connection string. |
| `DB_SERVER_SELECTION_TIMEOUT_MS` | How long to wait for MongoDB before answering 503, from 100 to 30000. Default 5000. |
| `SESSION_SECRET` | Required. At least 32 characters. |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API from a browser. Empty allows none. |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`. Default `info`. |
| `APP_NOW` | Pins the clock to a fixed date or date and time. Development, test and ci only. |

`APP_ENV` is not `NODE_ENV`. Next sets `NODE_ENV` to `production` for every build, so it cannot tell a local run from a deployment. `APP_ENV` decides which adapters are used and whether the session cookie is `secure`, and it has no default, so a deployment that forgets it refuses to start (ADR 0010). Later phases add their keys to the schema and to `.env.example` together.

## Testing

`npm test` runs Vitest against one in-memory MongoDB, with a separate database for each test file, so files run in parallel and need no Docker. The first run downloads the MongoDB binary. The version is pinned in `package.json` under `config.mongodbMemoryServer`.

- The suite runs with `TZ=UTC`, so a test that shows a 1 January departure as 1 January proves the code does not depend on the server's time zone.
- The mail, queue, storage, Stripe, rate-limit and cache adapters are fakes. `fakes` in `test/helpers/fakes.ts` shows what the app sent, and every fake is emptied before each test.
- Tests use real people, tours and dates from `seed/data/`, through `createUser`, `createTour`, `createReview` and `createBooking`. Tests never invent names, emails or tour text.
- A test that proves a requirement carries its ID in the name, for example `it('[S14] ...')`.
- `npm run test:coverage` enforces 75% of lines across `src/server/` and 85% for each `service.ts` file. The real adapters are excluded (ADR 0024).
- `test/examples/` holds one example each for a Server Action, a page data function and a service shared by an action and a Route Handler. Copy the one you need.

## Quality gates

CI (`.github/workflows/ci.yml`) runs on every push and pull request. The `checks` job runs `npm ci`, `typecheck`, `lint`, `lint:css`, `format:check`, `check:client`, `check:conventions`, `check:env`, `knip`, `npm audit --audit-level=high` and `test:coverage`. The `build` job runs `build` with no environment, starts MongoDB from the same downloaded binary the tests use (`npm run ci:mongo`, ADR 0026), generates a session secret for the run, then `smoke` and `bundle:check`, and keeps the Lighthouse results as a workflow artifact. Dependabot checks npm and GitHub Actions weekly.

To run the same checks locally, run each script above in that order. They all need to exit 0.

What has been verified on GitHub Actions: on 9 Nov 2026, run [42655320866](https://github.com/rithik56/natours-claude/actions/runs/42655320866) on the `gsd/phase-01-foundation-and-contracts` branch at commit `cf7ae39` finished with conclusion success, and both the `checks` and `build` jobs passed. In the `build` job, MongoDB started from the test binary, `build` and `smoke` passed, the generated `SESSION_SECRET` reached the later steps through `$GITHUB_ENV`, and `bundle:check` ran its three Lighthouse runs in Chrome on the runner and reported 138,229 bytes of script for `/` against a limit of 179,067 bytes (the runner figure is 122 bytes above the 138,107 floor recorded on a Mac). The `checks` job also confirmed the pinned test `mongod` 8.0.34 on Linux. An earlier run, on commit `028ff19`, failed because the `mongo:8.0` service container would not start on the runner kernel (ADR 0026).

What has not been verified:

- **The `mongo:8.0` service container on a runner.** The `build` job no longer uses it (ADR 0026), so it was replaced, not fixed.
- **Branch protection and the pull request flow.** Nothing has been merged to `main`, and only a `push` run has been seen. A run triggered by a pull request has not.
- **`npm run dev` in a plain terminal.** `next dev` was checked for writing `AGENTS.md` only with an agent detected, and only with `agentRules: false` set (plan 01-15). Behaviour with no agent detected, and through `npm run dev`, was not checked.
- **`basic-ftp` is overridden to 6.2.6** in `package.json`. `@lhci/cli` pulls in an older release with a high-severity advisory that would fail the audit step. The override can go once the dependency that needs it moves on (ADR 0018).

## Commits

Commits follow Conventional Commits and cite the requirement IDs they cover and the GSD plan that made them: `type(scope): summary [IDs] (NN-NN)`. For example:

```text
feat(session): pin HS256 and reject stale tokens [S14, B14] (01-09)
```

A commit that adds a dependency gives a one-line reason for each new package in its body (Q8, Q11). A requirement ID means the same thing in `plan.md`, in `.planning/REQUIREMENTS.md`, in a commit message and in a test name (ADR 0002, ADR 0003).

## Deployment

Deployment to AWS arrives in Phase 8, and the decision is in [ADR 0019](docs/adr/0019-deploy-on-aws-instead-of-render.md).

## Decisions

Every decision that departs from `plan.md` is in [`docs/adr/README.md`](docs/adr/README.md). The shared contracts, with exact TypeScript signatures, are in [`docs/contracts.md`](docs/contracts.md).
