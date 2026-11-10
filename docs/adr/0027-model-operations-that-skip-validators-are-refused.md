# 0027. Model operations that skip validators are refused

Status: Accepted
Date: 9 Nov 2026
Requirements: B14, S3, B20, SEC-18
Plan review: none (code review finding WR-04; threats T-01-24 and T-01-25)

## Context

Mongoose runs schema validators on `save()`, `create()` and `insertMany()`, and on update queries only when `runValidators` is set (`withUpdateValidators`, QA-04). Some operations run no validators at all. The `User` password is hashed only in a `pre('save')` hook (B14), and `passwordChangedAt`, which invalidates old sessions (SEC-18), is written only by that hook. Code review finding WR-04 and the security audit (threats T-01-24 and T-01-25) found these gaps. Each was reproduced against an in-memory MongoDB before the fix, by the failing tests in `test/server/schema-helpers.test.ts`:

- `User.replaceOne`, `User.findOneAndReplace` and `User.bulkWrite` accepted a document with a plain-text `password`, a `passwordChangedAt` and `role: 'admin'`.
- `User.insertMany` stored a plain-text `password`, because `insertMany` runs no `save` hook.
- The update guard looked at update keys only, so `{ $rename: { name: 'password' } }` passed it and renamed a field to `password`. A pipeline `$unset` stage naming `password` passed too.
- The same class of gap existed on `Booking`, `Tour` and `Review`: `replaceOne`, `findOneAndReplace` and `bulkWrite` skip the validators, so a booking with `price: -5` or `currency: 'usd'` could be stored.
- A call with `{ middleware: false }` skips every user-defined hook. `User.updateOne(filter, { $set: { password } }, { middleware: false })` was allowed, and `User.create([...], { middleware: false })` stored the password unhashed.

A security re-audit of the first fix found two more gaps, reproduced by failing tests before the follow-up fix (commit 7a0ed76):

- **Pipeline updates.** `User.updateOne(filter, [{ $replaceWith: { $setField: { field: 'password', input: '$$ROOT', value: 'plain-text-pass-9' } } }], { updatePipeline: true })` stored a plain-text `password`, because the password guard reads update keys and `$setField` carries the field name as a value. No check of the keys of a pipeline can promise that it leaves a field alone. Mongoose accepts an array update only when `updatePipeline: true` is passed, so request input cannot reach it, but server code could. On `Tour`, `Review` and `Booking` a pipeline also skips the validators.
- **Update validators could be switched off.** `withUpdateValidators` set `runValidators` in an ordinary hook, so `Booking.updateOne({ _id }, { $set: { price: 0 } }, { middleware: false })` stored `price: 0`, while the same call without the option was rejected.

No code in `src/` calls any of these operations yet. The Phase 4 seed is where `insertMany` would first be used.

## Decision

- **Refused on all four models.** `refuseValidatorBypass(schema)` in `src/server/schema-helpers.ts` makes `replaceOne`, `findOneAndReplace` and `bulkWrite` throw on `User`, `Tour`, `Review` and `Booking`. The error is a plain `Error` (a programming error that never reaches a person). It names the operation and the model, points at this ADR, and carries no document data. The refusal covers every `bulkWrite` operation, including inserts, because one rule is simpler to keep than a per-operation one.
- **`User.insertMany` works and hashes.** A `pre('insertMany')` hook on `User` builds each document, refuses one that supplies `passwordChangedAt`, validates the plain password with the schema's validators (including the 72-byte rule of B14), and only then hashes it with `hashPassword`, the same function and cost the save hook uses (cost 4 under `APP_ENV=test`, 12 otherwise). Mongoose runs `insertMany` hooks before its own validation and a hash is always 60 characters, so the hook has to validate the plain value itself. The whole batch is checked before anything is written, so one rejected document stores nothing, even with `ordered: false`. `lean: true` and a single non-array document are hashed too.
- **The password guard on update queries is wider.** `findOneAndUpdate`, `updateOne` and `updateMany` refuse an update in which `password` or `passwordChangedAt` (or a path under `password.`) appears as a key at any depth, as the source or the target of `$rename`, or as a name in a pipeline `$unset` stage. This covers `$set`, `$setOnInsert` (and so upserts), `$unset`, pipeline `$set`, `$replaceRoot` and `$replaceWith`. `passwordResetToken` and `passwordResetExpires` are not protected: the reset flow in a later phase writes them.
- **Per-call `{ middleware: false }` cannot switch these hooks off.** Mongoose keeps running a hook that carries its built-in marker, `Symbol.for('mongoose:built-in-middleware')`. The refusal hooks, the password guard, the password hash on `save` and the `insertMany` hook carry it, through `alwaysRuns` in `src/server/schema-helpers.ts`.
- **Every pipeline (array) update is refused.** `refuseValidatorBypass` also makes `updateOne`, `updateMany` and `findOneAndUpdate` throw on all four models when `getUpdate()` is an array, whatever its stages say. It is a backstop: it does not depend on understanding the stages, so `$setField` and any other expression or future operator are covered. The `User` key check for pipelines stays, and runs first, so a pipeline that names `password` still gets the `User.save()` message. The error names the operation and the model, points at this ADR and carries no update data. Services use an update document with operators, or load the document and call `save()`.
- **Update validators cannot be switched off.** The hook in `withUpdateValidators` carries `alwaysRuns`, so `{ middleware: false }` does not skip it. It also sets `runValidators: true` over whatever the caller passed, so `runValidators: false` does not turn validation off either (a test pins this).
- **A later phase that genuinely needs `bulkWrite`, `replaceOne` or `findOneAndReplace`** adds a narrow, reviewed allowance with its own test, in a new ADR that supersedes this one.

## Consequences

- Services keep using `create`, `save`, `insertMany` (on `User` it hashes) and the validated update methods. A refusal in a test or in development shows the call that has to change.
- `insertMany` on `User` validates each document twice: once in the hook and once in Mongoose, on the hashed value. The second pass is harmless and is the cost of keeping the plain password under the validators.
- `ordered: false` no longer inserts the valid documents of a batch that has an invalid one, because the hook rejects the batch first. The Phase 4 seed should treat a rejected batch as a failed seed.
- The marker `Symbol.for('mongoose:built-in-middleware')` is Mongoose's own convention and is not documented as public API. `test/server/schema-helpers.test.ts` has tests that fail if a Mongoose upgrade stops honouring it, so the loss would be noticed.
- Not covered: code that reaches the driver directly, such as `Model.collection.updateOne` or `Model.db`. The test factories do this on purpose to build stale-token cases. No check can stop it here.
- A pipeline update is refused even when it is harmless, and there is no per-call way to allow one. A later phase that needs one adds a narrow allowance with its own test, in a new ADR. No code in `src/` and no test factory issues a pipeline update today (checked with a search for array updates, `updatePipeline` and `$setField`); only the tests for this ADR do.
- `Tour`'s `pre('findOneAndUpdate')` hook that regenerates the slug on rename is an ordinary hook, so `{ middleware: false }` skips it and leaves the slug stale. It is not a validator or a password rule, so it is left as it is.
- The password-guard change was exercised through `updateOne` for each operator form, and through `findOneAndUpdate` and `updateMany` for `$rename`. The other combinations share the same function but were not each run.
- The follow-up was exercised for `updateOne`, `updateMany` and `findOneAndUpdate` on all four models, with and without `{ middleware: false }`. Mutation checks: removing the array refusal fails 21 tests, and unwrapping `alwaysRuns` from the validator hook fails 3.
- This closes WR-04 and threats T-01-24 and T-01-25, and the same gap on `Tour`, `Review` and `Booking` noted against T-01-27. Mutation checks: removing the registration on `User` fails four tests, on `Booking` five, disabling the `insertMany` hook seven, removing the marker four, and reverting the `$rename` and `$unset` handling five.
