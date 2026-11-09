import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import {
  toPublicUser,
  toSelf,
  type PublicUser,
  type SelfUser,
} from '@/server/modules/users/dto';
import { User, type UserRecord } from '@/server/modules/users/model';
import { useTestDatabase } from '../../../helpers/db';
import { createUser } from '../../../helpers/factories';
import { seedUsers } from '../../../helpers/seed';

const SENSITIVE_KEYS = [
  'password',
  'passwordChangedAt',
  'passwordResetToken',
  'passwordResetExpires',
  'active',
  '__v',
  '_id',
];

describe('user DTO mappers', () => {
  useTestDatabase();

  it('[S3] toPublicUser returns exactly id, name, photo and role', async () => {
    const { user } = await createUser({ role: 'guide' });

    const mapped: PublicUser = toPublicUser(user);

    expect(Object.keys(mapped).sort()).toEqual(['id', 'name', 'photo', 'role']);
    expect(mapped.id).toBe(user._id.toString());
    expect(typeof mapped.id).toBe('string');
    expect(mapped.name).toBe(user.name);
    expect(mapped.role).toBe('guide');
  });

  it('[S3] toSelf adds email and nothing else', async () => {
    const { user } = await createUser({ role: 'admin' });

    const mapped: SelfUser = toSelf(user);

    expect(Object.keys(mapped).sort()).toEqual([
      'email',
      'id',
      'name',
      'photo',
      'role',
    ]);
    expect(mapped.email).toBe('nikhil.bhatt@example.com');
    expect(mapped.id).toBe('48b775f3ee92f4a73aefdecd');
  });

  it('[S3] neither mapper carries a sensitive key, even from a loaded record with every field', async () => {
    const { user } = await createUser({ passwordChangedAt: new Date() });
    const full = await User.findById(user._id)
      .select('+password +passwordResetToken +passwordResetExpires +active')
      .lean<UserRecord>();

    for (const mapped of [toPublicUser(full!), toSelf(full!)]) {
      for (const key of SENSITIVE_KEYS) {
        expect(Object.keys(mapped)).not.toContain(key);
      }
    }
  });

  it('[S3] toPublicUser has no email, so a guide or reviewer cannot be contacted from it', async () => {
    const { user } = await createUser({ role: 'lead-guide' });

    expect(Object.keys(toPublicUser(user))).not.toContain('email');
  });

  it('[R6] a user without a photo maps to photo null in both mappers', async () => {
    const { user } = await createUser();

    expect(toPublicUser(user).photo).toBeNull();
    expect(toSelf(user).photo).toBeNull();
  });

  it('[R6] a user with a photo keeps the storage key', () => {
    const person = seedUsers()[0]!;
    const source = {
      _id: new Types.ObjectId(person._id),
      name: person.name,
      photo: `users/${person._id}.jpg`,
      role: person.role,
    };

    expect(toPublicUser(source).photo).toBe(`users/${person._id}.jpg`);
  });

  it('[R6] the output is plain: it survives structuredClone and JSON unchanged and holds no ObjectId', async () => {
    const { user } = await createUser({ role: 'admin' });
    const mapped = toSelf(user);

    expect(structuredClone(mapped)).toEqual(mapped);
    expect(JSON.parse(JSON.stringify(mapped))).toEqual(mapped);
    for (const value of Object.values(mapped)) {
      expect(value).not.toBeInstanceOf(Types.ObjectId);
      expect(value).not.toBeUndefined();
    }
  });

  it('[S3] mapping different users concurrently never mixes fields', async () => {
    const people = await Promise.all([
      createUser({ role: 'admin' }),
      createUser({ role: 'guide' }),
      createUser({ role: 'lead-guide' }),
    ]);

    const mapped = await Promise.all(
      people.map(async ({ user }) => toSelf(user)),
    );

    mapped.forEach((entry, index) => {
      expect(entry.email).toBe(people[index]!.user.email);
      expect(entry.id).toBe(people[index]!.user._id.toString());
    });
  });
});
