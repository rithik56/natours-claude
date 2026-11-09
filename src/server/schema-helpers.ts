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
