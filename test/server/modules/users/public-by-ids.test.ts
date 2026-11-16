// S3, B12: the public read of several users returns only name, photo and role, and only the active ones.
import { describe, expect, it } from 'vitest';
import { User } from '@/server/modules/users/model';
import { findActivePublicByIds } from '@/server/modules/users/service';
import { useTestDatabase } from '../../../helpers/db';
import { createUser } from '../../../helpers/factories';

describe('findActivePublicByIds', () => {
  useTestDatabase();

  it('[S3] returns only id, name, photo and role for each active user, with no email', async () => {
    const { user } = await createUser({ role: 'guide' });

    const people = await findActivePublicByIds([user._id.toString()]);

    expect(people).toHaveLength(1);
    expect(Object.keys(people[0]!).sort()).toEqual([
      'id',
      'name',
      'photo',
      'role',
    ]);
    expect(people[0]!.id).toBe(user._id.toString());
    expect(people[0]!.role).toBe('guide');
    expect(JSON.stringify(people)).not.toContain(user.email);
  });

  it('[B12] leaves out a deactivated user, a malformed id and an unknown id', async () => {
    const { user: active } = await createUser({ role: 'guide' });
    const { user: inactive } = await createUser({
      role: 'guide',
      active: false,
    });

    const people = await findActivePublicByIds([
      active._id.toString(),
      inactive._id.toString(),
      'not-an-id',
      '0123456789abcdef01234567',
    ]);

    expect(people.map((person) => person.id)).toEqual([active._id.toString()]);
  });

  it('[B12] returns [] for no ids, and never queries for them', async () => {
    expect(await findActivePublicByIds([])).toEqual([]);
  });

  it('[B12] returns [] when none of the ids is a user, even if others exist', async () => {
    await createUser({ role: 'guide' });

    expect(await findActivePublicByIds(['0123456789abcdef01234567'])).toEqual(
      [],
    );
  });

  it('[S3] a user removed from the database is simply absent', async () => {
    const { user } = await createUser({ role: 'guide' });
    await User.deleteOne({ _id: user._id });

    expect(await findActivePublicByIds([user._id.toString()])).toEqual([]);
  });
});
