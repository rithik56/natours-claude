# 0005. Contracts are written per phase

Status: Accepted
Date: 9 Nov 2026
Requirements: Q10
Plan review: none

## Context

`plan.md` P0-7 asks for `docs/contracts.md` to hold all of §4 with exact TypeScript signatures, written in Phase 0. That includes the service signatures (§4.4) and the email-template props, for features that don't exist yet. Signatures written that early, before the code that uses them, tend to be wrong and then have to be rewritten.

## Decision

Phase 1 (D-07) writes the shared parts of `docs/contracts.md`, with exact TypeScript signatures:

- the §4.1 response format and the §4.2 error codes;
- the §4.3 server helpers: `getSession`, `getCurrentUser`, `requireUser`, `requireRole`, `withApi`, `action()`, `ActionState`, `parseQuery` and `safeNext`;
- `format.ts` and the IST date helpers;
- the adapter interfaces: mailer, storage, Stripe, queue and rate limit;
- the §4.5 test helpers;
- the model fields and the DTO types.

Each feature phase adds its own service signatures (§4.4) and email-template props when it builds them.

This deviates from P0-7's "all of §4".

## Consequences

- `docs/contracts.md` is accurate at the end of every phase, because each signature is written next to the code it describes.
- The service and email-template sections stay empty until the phase that builds them, so a reader looking for them early will not find them.
- Each feature phase includes updating `docs/contracts.md` in its definition of done.
