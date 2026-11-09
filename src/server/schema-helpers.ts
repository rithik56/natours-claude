import 'server-only';
import { model, type Model, type Schema } from 'mongoose';

export function registerModel<T>(name: string, schema: Schema<T>): Model<T> {
  return model<T>(name, schema);
}

export function withUpdateValidators<T>(schema: Schema<T>): Schema<T> {
  return schema;
}
