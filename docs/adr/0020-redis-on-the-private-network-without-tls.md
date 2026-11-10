# 0020. Redis on the private network, without TLS

Status: Accepted
Date: 9 Nov 2026
Requirements: S12
Plan review: SEC-21; PROJECT.md Key Decision 4

## Context

`plan.md` S12 asks for TLS with certificate checks on every connection to a data store. The plan review (SEC-21) found two problems with reading that strictly for Redis:

- It was written for Render, whose internal Key Value URL is plain `redis://` and unauthenticated by default, so a strict S12 would force `rediss://` and fail to connect.
- BullMQ keeps completed and failed jobs by default, so password-reset links and email addresses stay in Redis unless the queue is told to remove them.

On AWS (ADR 0019) there is no managed Redis on a zero budget. Redis runs as a container beside the web server and the worker.

## Decision

- **Redis runs on the instance's private Docker network without TLS.** This amends S12 (PROJECT.md Key Decision 4).
- **TLS with certificate checks stays on** for MongoDB Atlas and for SMTP, which leave the private network.
- **Nothing outside the private network reaches Redis.** The compose file in Phase 5 and the Phase 8 deployment must not publish Redis's port to the host.

## Consequences

- S12 reads: TLS certificate checks stay on for Atlas and SMTP, and Redis is the one recorded exception.
- Anyone who can run a container on the same Docker network can read Redis, so the instance and its compose file are the trust boundary. Phase 8 treats access to the instance accordingly.
- SEC-21's other points are not decided here. How long the queue keeps finished and failed jobs, and whether Redis also needs a password, are decided in Phase 5 when the queue is built. SEC-21 also notes that SMTP certificate checks do nothing if STARTTLS is skipped. The review marked nodemailer's behaviour there as unverified, so Phase 5 checks it.
- `.env.example` and `src/server/config-schema.ts` have no Redis key yet. The phase that adds the client adds the key to both (ADR 0010).
