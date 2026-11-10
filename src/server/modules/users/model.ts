import 'server-only';
import bcrypt from 'bcryptjs';
import mongoose, {
  Schema,
  type HydratedDocument,
  type Model,
  type Query,
  type Types,
} from 'mongoose';
import { messages } from '@/lib/messages';
import { now } from '@/server/clock';
import { getConfig } from '@/server/config';
import { ROLES, type Role } from '@/server/roles';
import {
  alwaysRuns,
  refuseValidatorBypass,
  registerModel,
  withUpdateValidators,
} from '@/server/schema-helpers';
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

type UserModel = Model<UserFields>;

/** A lean user as services return it: no password, reset fields or active flag. */
export type UserRecord = Omit<
  UserFields,
  'password' | 'passwordResetToken' | 'passwordResetExpires' | 'active'
> & { _id: Types.ObjectId };

const PROTECTED_FIELDS = ['password', 'passwordChangedAt'];
const BCRYPT_COST_TEST = 4;
const BCRYPT_COST = 12;

const PASSWORD_WRITE_MESSAGE =
  'password and passwordChangedAt are written only by User.save()';

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

function hashPassword(plain: string): Promise<string> {
  const cost = getConfig().APP_ENV === 'test' ? BCRYPT_COST_TEST : BCRYPT_COST;
  return bcrypt.hash(plain, cost);
}

// B14: the only writer of passwordChangedAt. Validation has already checked the
// plain password's length in characters and bytes by the time this runs, so the
// hash is never measured.
schema.pre(
  'save',
  alwaysRuns(async function (this: UserDoc) {
    if (!this.isModified('password')) return;
    this.password = await hashPassword(this.password);
    if (!this.isNew) this.passwordChangedAt = now();
  }),
);

// B14, WR-04: insertMany runs no save hook, so this hook hashes the passwords
// there. Mongoose runs insertMany hooks before it validates, and a hash is
// always 60 characters, so the plain password is validated here first, on a
// hydrated document, and only then hashed. The whole batch is checked and
// hashed before anything is written, so one rejected document stores nothing,
// even with `ordered: false`. A document that supplies passwordChangedAt is
// refused, because only save() sets it.
schema.pre(
  'insertMany',
  alwaysRuns(async function (this: UserModel, docs: unknown) {
    const batch: unknown[] = Array.isArray(docs) ? docs : [docs];
    const prepared: UserDoc[] = [];
    for (const entry of batch) {
      const doc = entry instanceof this ? entry : new this(entry);
      if (doc.get('passwordChangedAt') !== undefined) {
        throw new Error(PASSWORD_WRITE_MESSAGE);
      }
      await doc.validate();
      doc.password = await hashPassword(doc.password);
      prepared.push(doc);
    }
    // Mongoose's types say a hook returns nothing, but Kareem swaps the
    // arguments of the next step for these.
    return mongoose.overwriteMiddlewareArguments(prepared) as never;
  }),
);

function isProtectedPath(path: string): boolean {
  return PROTECTED_FIELDS.some(
    (field) => path === field || path.startsWith(`${field}.`),
  );
}

function namesProtectedPath(value: unknown): boolean {
  if (typeof value === 'string') return isProtectedPath(value);
  if (Array.isArray(value)) return value.some(namesProtectedPath);
  return false;
}

// Looks for a protected path anywhere in an update: as a key under any
// operator or pipeline stage (at any depth, which covers $set, $setOnInsert,
// $unset, $addFields, $replaceRoot and $replaceWith), as the source or the
// target of $rename, and as a name in a pipeline $unset stage.
function setsProtectedField(update: unknown): boolean {
  if (Array.isArray(update)) return update.some(setsProtectedField);
  if (typeof update !== 'object' || update === null) return false;
  return Object.entries(update).some(([key, value]) => {
    if (isProtectedPath(key)) return true;
    if (key === '$unset' && namesProtectedPath(value)) return true;
    if (key === '$rename' && typeof value === 'object' && value !== null) {
      return Object.entries(value).some(
        ([from, to]) => isProtectedPath(from) || namesProtectedPath(to),
      );
    }
    return setsProtectedField(value);
  });
}

// B14: an update query must not write the password or its change time.
schema.pre(
  ['findOneAndUpdate', 'updateOne', 'updateMany'],
  alwaysRuns(function (this: Query<unknown, UserFields>) {
    if (setsProtectedField(this.getUpdate())) {
      throw new Error(PASSWORD_WRITE_MESSAGE);
    }
  }),
);

export const User = registerModel(
  'User',
  refuseValidatorBypass(withUpdateValidators(schema)),
);
