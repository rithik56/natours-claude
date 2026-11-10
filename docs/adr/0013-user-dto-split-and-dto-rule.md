# 0013. User DTO split and the DTO rule

Status: Accepted
Date: 9 Nov 2026
Requirements: S3, R6
Plan review: SEC-10, SEC-11

## Context

`plan.md` S3 and R6 say documents never reach the browser directly: they pass through the mappers in a module's `dto.ts`, which return plain objects without password, token or `active` fields. Two gaps came up in the plan review:

- One `toPublicUser` mapper cannot serve both `/me` and public pages. If it includes `email`, `GET /api/v1/tours/[tourId]/reviews` serves every reviewer's email to anyone. If it leaves `email` out, `/me` has nothing to show (SEC-10).
- The rule covered API responses and Client Component props only. Data also leaves the server in Server Action return values, error payloads and log lines (SEC-11).

## Decision

- **The user mappers are split.** `toPublicUser` returns `{ id, name, photo, role }` and is used for guides, review authors and any public response. `toSelf` returns `{ id, name, email, role, photo }` and is used for the current user and `/me`. Neither includes `password`, `passwordChangedAt`, reset fields or `active`.
- **The name stays `toPublicUser`,** as `plan.md` writes it, rather than the `toPublicProfile` the review suggested. The behaviour SEC-10 asks for is the same.
- **There is no admin mapper yet.** Whether admins see `active` and `createdAt` is a Phase 5 decision (F5), made against `plan.md` 1.3's rule that `active` never reaches the browser. That phase adds `toAdminUser` or records why it does not.
- **Mappers are pure.** They hold no module state, read nothing but their argument, and return a fresh plain object, so concurrent requests cannot see each other's data. `photo` is `null` when absent, so an output never carries an `undefined` value or an `ObjectId`.
- **The DTO rule is extended to every exit.**
  - `ActionState.data` is a DTO or a plain value, never a document.
  - Error responses carry only the `AppError` message and field details. Driver and Mongoose messages go to the logs and are never returned.
  - Log fields follow the redaction rules in `src/server/logger.ts`: no passwords, tokens, cookies or `stripe-signature` values.
- **Representation.** DTOs carry ids as strings, instants as ISO strings, and calendar days as India Standard Time day strings (`YYYY-MM-DD`).

## Consequences

- Every new module with browser-facing data writes its mappers in `dto.ts` with key-exact tests, as `test/server/modules/users/dto.test.ts` does for users.
- Public tour, review and guide responses are tested for the absence of an `email` key (S3). Phases 4 and 5 add those tests as the endpoints appear.
- Adding a field to the User model does not expose it by accident: a mapper lists its keys, so a new field is invisible to the browser until someone adds it.
- `findActiveById` returns a lean record rather than a DTO. It is for server code, such as the session, and its result is mapped before it leaves the server.
