import 'server-only';
import mongoose, { type Model, type Schema } from 'mongoose';

/**
 * Registers a model once per process. Hot reload re-runs the module that calls
 * this, and mongoose throws OverwriteModelError on a second `model()` call for
 * the same name, so an existing registration is returned instead (B17).
 */
export function registerModel<T>(name: string, schema: Schema<T>): Model<T> {
  const existing = mongoose.models[name] as Model<T> | undefined;
  return existing ?? mongoose.model<T>(name, schema);
}

/**
 * Makes update queries run schema validators, which mongoose skips by default
 * (QA-04). Applies to findOneAndUpdate, updateOne and updateMany.
 */
export function withUpdateValidators<T>(schema: Schema<T>): Schema<T> {
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
    this.setOptions({ runValidators: true });
  });
  return schema;
}

/**
 * Mongoose lets any call switch off every user-defined hook with
 * `{ middleware: false }`. It keeps running only the hooks that carry this
 * marker, which Mongoose uses for its own hooks (it is `Symbol.for`, so the
 * same symbol is reachable here). Security hooks carry it so that no call can
 * turn the password guard, the password hash or the refusals below off.
 */
const KEEP_RUNNING_WITH_MIDDLEWARE_OFF = Symbol.for(
  'mongoose:built-in-middleware',
);

/** Marks a hook so that a call with `{ middleware: false }` still runs it. */
export function alwaysRuns<F extends (...args: never[]) => unknown>(
  hook: F,
): F {
  Object.defineProperty(hook, KEEP_RUNNING_WITH_MIDDLEWARE_OFF, {
    value: true,
  });
  return hook;
}

/**
 * Refuses `replaceOne`, `findOneAndReplace` and `bulkWrite` on this model.
 * Mongoose runs no schema validators for the first two, and the security
 * auditor reproduced `bulkWrite` storing a price of 0. None of them reaches the
 * password hash either, so each could store a price of -5 or a plain-text
 * password. A refusal is a programming error that never reaches a person; its
 * message names the operation and the model and carries no document data
 * (ADR 0027).
 */
export function refuseValidatorBypass<T>(schema: Schema<T>): Schema<T> {
  schema.pre(
    ['replaceOne', 'findOneAndReplace'],
    alwaysRuns(function (this: { model: { modelName: string }; op: string }) {
      throw refusal(this.model.modelName, this.op);
    }),
  );
  schema.pre(
    'bulkWrite',
    alwaysRuns(function (this: { modelName: string }) {
      throw refusal(this.modelName, 'bulkWrite');
    }),
  );
  return schema;
}

function refusal(modelName: string, operation: string): Error {
  return new Error(
    `${modelName}.${operation} is refused because it skips schema validators ` +
      '(ADR 0027, docs/adr/0027-model-operations-that-skip-validators-are-refused.md). ' +
      'Use create(), save() or a validated update instead.',
  );
}
