# 0016. Adapters are selected by APP_ENV

Status: Accepted
Date: 9 Nov 2026
Requirements: Q7, S3
Plan review: ARC-02, ARC-03, ARC-24, QA-21, SEC-09

## Context

The app talks to six outside things: a mail sender, an email queue, file storage, Stripe, a rate limiter and a tagged data cache. `plan.md` 3.2 rule 9 says each sits behind an interface, and Q7 says tests run with no network. Three questions needed an answer before any caller exists:

- What chooses between a fake and a real adapter? `NODE_ENV` is `production` for every `next build`, including Playwright and Lighthouse runs, so it cannot tell a test run from a deployment (QA-21).
- What happens in staging or production while a real adapter is still missing? Quietly serving a fake there would take payments that never reach Stripe, or send mail that goes nowhere.
- What does an email job carry? A queue that accepts any object invites a whole user document, password hash included, into Redis (S3).

## Decision

- **Selection uses `APP_ENV`, not `NODE_ENV`.** `getDeps()` in `src/server/deps.ts` reads `getConfig().APP_ENV`, which has no default and is validated at startup (ADR 0010). The result is built once per process.
- **Development, test and ci use fakes** for the mailer, email queue, storage, Stripe and rate limiter, until the real adapters land: mailer, queue and rate limiter in Phase 5, Stripe in Phase 6, and storage in Phase 4 or 8.
- **Staging and production refuse.** Their `Deps` object has throwing getters for those five. Reading one throws `No real <name> adapter is configured yet (ADR 0016); <phase> adds it`. The error is a plain `Error`, not an `AppError`, so `withApi` answers with the generic `INTERNAL` response and the message stays in the logs. There is no fallback path, so a deployment that forgets an adapter fails on first use, and loudly. A phase that adds a real adapter replaces its getter with the adapter in the same change.
- **The cache is the one exception.** Under `APP_ENV=test` it is the fake: `cached` calls the function directly and `invalidate` records tags in `invalidated`. In every other environment it is `createNextCache()`, which wraps `unstable_cache(fn, keyParts, { tags })` and calls `revalidateTag(tag, { expire: 0 })`, as ADR 0012 records. `real-cache.ts` is the only file that imports `next/cache` (lint enforces it) and is excluded from coverage, because `unstable_cache` throws outside a Next request. The production build proves it compiles. Phase 4 settles the cache keys and tag names when the first cached service arrives (ARC-02, ARC-03).
- **Location.** Adapters live together in `src/server/adapters/` (`mailer`, `queue`, `storage`, `stripe`, `rate-limit`, `cache`, `real-cache`), not in the separate `queue`, `storage`, `stripe` and `mailer` folders that `plan.md` 3.3 sketches (ARC-24). One folder lets lint and coverage rules name the adapter layer once. ADR 0012 mentions `src/server/cache.ts`; the cache adapter is `src/server/adapters/cache.ts`.
- **Email jobs carry exactly `{ template, to, firstName, url }`** (S3). The fake queue rejects a job with any other key, or with one missing, and stores a copy. The extra props a `BookingConfirmed` email needs (SEC-09) are decided in Phase 6 by its own ADR.
- **Fake Stripe.** It records sessions, takes only whole paise in `inr`, and `constructEvent` throws a `StripeSignatureError` whose `type` is `StripeSignatureVerificationError` unless the signature equals `signatureFor(rawBody)`, an HMAC of the body under a fixed fake key. The type string matches what the real SDK is believed to use (RESEARCH A2); Phase 6 confirms it against the SDK.
- **Fake rate limiter.** A fixed window per rule name and key. It reads the clock through `now()` from `src/server/clock.ts`, so tests can move time with fake timers. With `APP_NOW` pinned in development the window never advances, so a development server stays limited until it restarts; leave `APP_NOW` unset when working on a limited route.
- **Tests inspect and reset the fakes** through `fakes` in `test/helpers/fakes.ts`, and `test/setup.ts` runs `resetFakes()` before every test (Q7, QA-17). A test that needs another `APP_ENV` stubs the variable, calls `vi.resetModules()` and imports `getDeps` again.

## Consequences

- Callers import `getDeps()` and the interfaces. Adding a real adapter changes `deps.ts` and its own file, not its callers.
- A fake can never serve staging or production, because the choice is made by the validated `APP_ENV` and the production branch contains no fake.
- Until Phase 5, staging and production cannot send mail, queue jobs or rate-limit. That is the intended failure mode, and the same phases that add the adapters add the code that needs them.
- The `StripeSignatureError` type string, the cache keys and the `BookingConfirmed` payload are open items for Phases 4 and 6, as listed above.
