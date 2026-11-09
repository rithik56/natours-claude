import 'server-only';
import { Schema } from 'mongoose';
import { registerModel } from '@/server/schema-helpers';

const schema = new Schema({
  name: String,
  email: String,
  photo: String,
  role: String,
  password: String,
  passwordChangedAt: Date,
});

export const User = registerModel('User', schema);
