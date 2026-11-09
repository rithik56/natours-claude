// Example: how to test a Server Action built with action(). Later phases copy this shape.
// No feature action exists yet, so the action under test is a fixture defined here.
import { describe, expect, it } from 'vitest';
import { action } from '@/server/actions/action';
import { AppError } from '@/server/errors';
import { toPublicUser } from '@/server/modules/users/dto';
import { findActiveById } from '@/server/modules/users/service';
import { z } from '@/server/validation';
import { useTestDatabase } from '../helpers/db';
import { createUser } from '../helpers/factories';
import { mockSession } from '../helpers/mock-session';
import { seedUsers } from '../helpers/seed';

// A form with no fields: the strict schema refuses anything the form was not built to send.
const showProfileAction = action(
  z.strictObject({}),
  async (_input, { user }) => {
    const record = await findActiveById(user?.id ?? '');
    if (!record) throw new AppError('NOT_FOUND');
    return { data: toPublicUser(record) };
  },
  { access: 'auth' },
);

const start = { ok: true } as const;

describe('example: a Server Action', () => {
  useTestDatabase();

  it('[Q6] runs as a seed traveller and returns that person as a DTO', async () => {
    const { user } = await createUser({ role: 'user' });
    const person = seedUsers().find((entry) => entry._id === String(user._id));
    await mockSession(user);

    const state = await showProfileAction(start, new FormData());

    expect(person?.name).toBeTruthy();
    expect(state).toEqual({
      ok: true,
      data: {
        id: String(user._id),
        name: person?.name,
        photo: null,
        role: 'user',
      },
    });
  });

  it('[Q6] never sends the email, which a public profile does not carry (S3)', async () => {
    const { user } = await createUser({ role: 'user' });
    await mockSession(user);

    const state = await showProfileAction(start, new FormData());

    expect(JSON.stringify(state).includes(user.email)).toBe(false);
  });

  it('[Q6] gives an anonymous caller UNAUTHENTICATED and no data', async () => {
    await mockSession(null);

    const state = await showProfileAction(start, new FormData());

    expect(state.ok).toBe(false);
    expect(state.ok ? undefined : state.error.code).toBe('UNAUTHENTICATED');
  });

  it('[Q6] refuses a field the form was not built to send', async () => {
    const { user } = await createUser({ role: 'user' });
    await mockSession(user);
    const form = new FormData();
    form.append('role', 'admin');

    const state = await showProfileAction(start, form);

    expect(state.ok).toBe(false);
    expect(state.ok ? undefined : state.error.code).toBe('VALIDATION_ERROR');
  });
});
