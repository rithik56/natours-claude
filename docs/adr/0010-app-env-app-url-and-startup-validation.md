# 0010. APP_ENV, APP_URL and startup validation

Status: Accepted
Date: 9 Nov 2026
Requirements: D4, S14, S18
Plan review: QA-21, SEC-12, ARC-07, ARC-26, QA-20, DES-08

## Context

`plan.md` D4 asks the app to refuse to start on missing or invalid configuration, naming the key. S14 sets the session secret length and S18 keeps secrets out of the browser bundle. The plan review found several gaps in how those would work in practice:

- Next forces `NODE_ENV` to `production` for `next start`, which Lighthouse and Playwright use. A switch on `NODE_ENV` cannot tell a local test run from a deployment (QA-21).
- Anything that builds a public URL from request headers can be pointed at an attacker's host (SEC-12).
- Throwing from `register()` does not stop `next start` (RESEARCH Pitfall 2), and parsing config at module scope would make `next build` need every secret (ARC-07).
- "Only `config.ts` reads `process.env`" cannot hold for files that run before config exists (ARC-26).

## Decision

- **`APP_ENV` is separate from `NODE_ENV`.** It is required, with no default, and is one of development, test, ci, staging or production. A deployment that forgets it refuses to start instead of quietly running with fakes (QA-21).
- **`APP_URL` is the only source of the public origin.** The origin check, password-reset links and Stripe return URLs read it, never a request header (SEC-12). It must be an origin with no path, and https in staging and production.
- **Config is validated in `register()` when the Node.js runtime starts,** by `loadConfigOrExit()`, which writes `Invalid configuration:` and one `  - KEY: message` line per bad key to stderr and calls `process.exit(1)`. A throw would not stop the server (Pitfall 2). Nothing parses config at module scope, and `getConfig()` is lazy, so `next build` needs no environment (ARC-07).
- **Messages name keys and fixed text only.** No received value is ever written, so a mistyped secret cannot leak into a log. Empty strings count as missing. Keys appear in schema order.
- **The `process.env` read exceptions are `next.config.ts`, `src/proxy.ts` and the `NEXT_RUNTIME` check in `src/instrumentation.ts`** (ARC-26). Everything else goes through `getConfig()`.
- **`.env.example` keeps secret values empty.** `npm run check:env` fails if a schema key is missing from it, if it lists a key the schema does not know (other than `NEXT_PUBLIC_*`), if a secret-named key has a value, or if any `NEXT_PUBLIC_` name in it or in `src/**` or `next.config.ts` contains SECRET, KEY or PASSWORD (S18).
- **`APP_NOW` pins the clock** in development, test and ci only. Setting it in staging or production fails startup (QA-20).
- **`parseConfig` throws a `ConfigError`** carrying the key and message of each issue, instead of a `ZodError`. ESLint limits `zod` imports to `config-schema.ts` and `validation.ts` (ADR 0009), so `config-startup.ts` cannot name `ZodError`.
- **`server-only` works in the instrumentation layer.** `config-startup.ts` imports it, and `next start` loads `register()` without error, so the fallback of parsing `process.env` directly was not needed.

## Consequences

- `next build` still passes with no environment. CI builds without an env block, then runs `npm run smoke` against a MongoDB service. The smoke run starts the built app with an empty `SESSION_SECRET` and expects exit 1 naming the key, then starts it with a good environment and expects `/` and `/readyz` to answer 200.
- DES-08 notes that a public map tile key named with KEY, for example `NEXT_PUBLIC_MAP_TILES_KEY`, fails S18's check although such keys are public by design. This plan does not decide that. Phase 2 or Phase 4 decides by ADR, either by choosing a provider without a key or by narrowing the rule.
- A deployment must set `APP_ENV`, `APP_URL`, `MONGODB_URI` and `SESSION_SECRET`. The other keys have defaults or are optional.
- Later phases add their keys to `config-schema.ts` and `.env.example` together, and `check:env` fails if they forget one.
