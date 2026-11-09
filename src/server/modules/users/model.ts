import 'server-only';
import bcrypt from 'bcryptjs';
import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { messages } from '@/lib/messages';
import { now } from '@/server/clock';
import { getConfig } from '@/server/config';
import { ROLES, type Role } from '@/server/roles';
import { registerModel, withUpdateValidators } from '@/server/schema-helpers';
import { z } from '@/server/validation';

const { validation } = messages;

/** Every stored field of a user (plan.md 1.3). */
export interface UserFields {
  name: string;
  email: string;
  /** A storage key, not a URL. */
  photo?: string;
  role: Role;
  /** A bcrypt hash once saved. Never selected by default. */
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A hydrated user document. */
export type UserDoc = HydratedDocument<UserFields>;

/** A lean user as services return it: no password, reset fields or active flag. */
export type UserRecord = Omit<
  UserFields,
  'password' | 'passwordResetToken' | 'passwordResetExpires' | 'active'
> & { _id: Types.ObjectId };

const PROTECTED_FIELDS = ['password', 'passwordChangedAt'];
const BCRYPT_COST_TEST = 4;
const BCRYPT_COST = 12;

const emailSchema = z.email();

const schema = new Schema<UserFields>(
  {
    name: {
      type: String,
      required: [true, validation.required],
      trim: true,
      minlength: [1, validation.required],
      maxlength: [50, validation.tooLong(50)],
    },
    email: {
      type: String,
      required: [true, validation.required],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => emailSchema.safeParse(value).success,
        message: validation.invalidEmail,
      },
    },
    photo: { type: String, trim: true },
    role: { type: String, enum: [...ROLES], default: 'user' },
    password: {
      type: String,
      required: [true, validation.required],
      minlength: [8, validation.tooShort(8)],
      maxlength: [72, validation.tooLong(72)],
      // bcrypt reads only the first 72 bytes, and a letter can take up to
      // four, so the character limit alone lets a long password be cut short.
      validate: {
        validator: (value: string) => !bcrypt.truncates(value),
        message: validation.passwordTooLong,
      },
      select: false,
    },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    active: { type: Boolean, default: true, select: false },
  },
  { timestamps: true },
);

// B14: the only writer of passwordChangedAt. Validation has already checked the
// plain password's length in characters and bytes by the time this runs, so the
// hash is never measured.
schema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const cost = getConfig().APP_ENV === 'test' ? BCRYPT_COST_TEST : BCRYPT_COST;
  this.password = await bcrypt.hash(this.password, cost);
  if (!this.isNew) this.passwordChangedAt = now();
});

function setsProtectedField(update: unknown): boolean {
  if (Array.isArray(update)) return update.some(setsProtectedField);
  if (typeof update !== 'object' || update === null) return false;
  return Object.entries(update).some(([key, value]) =>
    key.startsWith('$')
      ? setsProtectedField(value)
      : PROTECTED_FIELDS.includes(key),
  );
}

// B14: an update query must not write the password or its change time.
schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  if (setsProtectedField(this.getUpdate())) {
    throw new Error(
      'password and passwordChangedAt are written only by User.save()',
    );
  }
});

export const User = registerModel('User', withUpdateValidators(schema));
