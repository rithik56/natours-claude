import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { User } from '@/server/modules/users/model';
import { findActiveById } from '@/server/modules/users/service';
import { useTestDatabase } from '../../../helpers/db';
import { createUser } from '../../../helpers/factories';

describe('findActiveById', () => {
  useTestDatabase();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[S6] returns the record for an active seed user, with passwordChangedAt and without a password', async () => {
    const changedAt = new Date('2026-10-01T04:30:00.000Z');
    const { user } = await createUser({
      role: 'guide',
      passwordChangedAt: changedAt,
    });

    const found = await findActiveById(user._id.toString());

    expect(found?.email).toBe(user.email);
    expect(found?.role).toBe('guide');
    expect(found?.passwordChangedAt).toEqual(changedAt);
    expect(Object.keys(found!)).not.toContain('password');
    expect(Object.keys(found!)).not.toContain('active');
    expect(Object.keys(found!)).not.toContain('__v');
  });

  it('[S6] returns null after the user is deactivated', async () => {
    const { user } = await createUser();
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { active: false } },
    );

    expect(await findActiveById(user._id.toString())).toBeNull();
  });

  it('returns null for a user created inactive', async () => {
    const { user } = await createUser({ active: false });

    expect(await findActiveById(user._id.toString())).toBeNull();
  });

  it('returns null for an unknown valid id and for a malformed id, without a CastError', async () => {
    await createUser();

    expect(
      await findActiveById(new mongoose.Types.ObjectId().toString()),
    ).toBeNull();
    expect(await findActiveById('not-an-id')).toBeNull();
    expect(await findActiveById('')).toBeNull();
  });

  it('throws SERVICE_UNAVAILABLE when the database stops answering during the query', async () => {
    const { user } = await createUser();
    const failure = new Error('connection closed');
    failure.name = 'MongoNetworkError';
    vi.spyOn(User, 'findOne').mockImplementation(() => {
      throw failure;
    });

    await expect(findActiveById(user._id.toString())).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
    });
  });

  it('lets an unrelated error through unchanged', async () => {
    const { user } = await createUser();
    vi.spyOn(User, 'findOne').mockImplementation(() => {
      throw new TypeError('unrelated');
    });

    await expect(findActiveById(user._id.toString())).rejects.toThrow(
      'unrelated',
    );
  });
});

describe('findActiveById with MongoDB unreachable', () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await mongoose.disconnect();
    delete (globalThis as { __natoursMongo?: unknown }).__natoursMongo;
  });

  it('[B10] rejects with SERVICE_UNAVAILABLE within the selection timeout', async () => {
    vi.stubEnv('MONGODB_URI', 'mongodb://127.0.0.1:1/natours');
    vi.stubEnv('DB_SERVER_SELECTION_TIMEOUT_MS', '500');
    vi.resetModules();
    delete (globalThis as { __natoursMongo?: unknown }).__natoursMongo;
    const fresh = await import('@/server/modules/users/service');

    const startedAt = Date.now();
    const outcome = await fresh
      .findActiveById('48b775f3ee92f4a73aefdecd')
      .catch((error: unknown) => error);

    expect(outcome).toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
    expect(Date.now() - startedAt).toBeLessThan(3000);
  }, 10_000);
});
