import { User, type UserDoc } from '@/server/modules/users/model';
import type { Role } from '@/server/roles';
import { seedUsers, type SeedUser } from './seed';

/** A test-only password, used for every factory user. It is never shown to a person. */
export const TEST_PASSWORD = 'Test-only-passphrase-2026';

type CreateUserOptions = {
  role?: Role;
  active?: boolean;
  /** Selects that seed person. Must be one of the emails in seed/data/users.json. */
  email?: string;
  password?: string;
  /** Written through the raw collection, so tests can build stale-token cases (SEC-18). */
  passwordChangedAt?: Date;
};

async function pickSeedPerson(options: CreateUserOptions): Promise<SeedUser> {
  const people = seedUsers();
  if (options.email !== undefined) {
    const person = people.find((entry) => entry.email === options.email);
    if (!person) {
      throw new Error(
        `createUser: ${options.email} is not a person in seed/data/users.json`,
      );
    }
    return person;
  }
  const role = options.role ?? 'user';
  const candidates = people.filter((entry) => entry.role === role);
  const taken = await User.find({
    _id: { $in: candidates.map((entry) => entry._id) },
  })
    .select('_id')
    .lean();
  const takenIds = new Set(taken.map((entry) => String(entry._id)));
  const next = candidates.find((entry) => !takenIds.has(entry._id));
  if (!next) {
    throw new Error(
      `createUser: every seed person with role ${role} already exists in this database`,
    );
  }
  return next;
}

/**
 * Creates a user from a real person in seed/data/users.json (D-08, QA-17).
 * Without `email`, picks the next seed person of the requested role (default user)
 * who is not yet in this database.
 */
export async function createUser(
  options: CreateUserOptions = {},
): Promise<{ user: UserDoc; password: string }> {
  const person = await pickSeedPerson(options);
  const password = options.password ?? TEST_PASSWORD;
  const user = await User.create({
    _id: person._id,
    name: person.name,
    email: person.email,
    role: person.role,
    active: options.active ?? person.active,
    password,
  });
  if (options.passwordChangedAt !== undefined) {
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { passwordChangedAt: options.passwordChangedAt } },
    );
  }
  return { user, password };
}
