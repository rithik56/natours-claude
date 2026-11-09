// Example of B13: one service function behind both a Route Handler and a Server Action,
// so the two entry points cannot drift. withApi and action() only do validation, access
// and error mapping. The business rule, here "which profile may be shown", is in the service.
import { describe, expect, it } from 'vitest';
import { ok } from '@/server/api/responses';
import { withApi } from '@/server/api/with-api';
import { action } from '@/server/actions/action';
import { AppError } from '@/server/errors';
import { toPublicUser } from '@/server/modules/users/dto';
import { findActiveById } from '@/server/modules/users/service';
import { z } from '@/server/validation';
import { callRoute } from '../helpers/call-route';
import { useTestDatabase } from '../helpers/db';
import { createUser } from '../helpers/factories';
import { mockSession } from '../helpers/mock-session';

// The shared service function. Both entry points call exactly this.
async function showProfile(id: string) {
  const record = await findActiveById(id);
  if (!record) throw new AppError('NOT_FOUND');
  return toPublicUser(record);
}

const inputSchema = z.strictObject({ id: z.string() });

const route = {
  GET: withApi(async ({ query }) => ok(await showProfile(query.id)), {
    access: 'auth',
    query: inputSchema,
  }),
};

const profileAction = action(
  inputSchema,
  async ({ id }) => ({ data: await showProfile(id) }),
  { access: 'auth' },
);

const start = { ok: true } as const;

function formFor(id: string): FormData {
  const form = new FormData();
  form.append('id', id);
  return form;
}

type Envelope = { status: string; data?: unknown; error?: { code: string } };

describe('example: one service behind a Route Handler and a Server Action', () => {
  useTestDatabase();

  it('[B13] both return identical DTOs for the same seed user', async () => {
    const { user: traveller } = await createUser({ role: 'user' });
    const { user: guide } = await createUser({ role: 'guide' });
    await mockSession(traveller);

    const fromRoute = await callRoute(route, {
      path: `/profile?id=${String(guide._id)}`,
      as: traveller,
    });
    const fromAction = await profileAction(start, formFor(String(guide._id)));

    expect(fromRoute.status).toBe(200);
    expect((fromRoute.body as Envelope).data).toEqual(toPublicUser(guide));
    expect(fromAction.ok ? fromAction.data : undefined).toEqual(
      (fromRoute.body as Envelope).data,
    );
  });

  it('[B13] a missing profile is NOT_FOUND from both, from the one service', async () => {
    const { user: traveller } = await createUser({ role: 'user' });
    await mockSession(traveller);
    const unknown = '64b7c0a1e4b0a1b2c3d4e5f6';

    const fromRoute = await callRoute(route, {
      path: `/profile?id=${unknown}`,
      as: traveller,
    });
    const fromAction = await profileAction(start, formFor(unknown));

    expect(fromRoute.status).toBe(404);
    expect((fromRoute.body as Envelope).error?.code).toBe('NOT_FOUND');
    expect(fromAction.ok ? undefined : fromAction.error.code).toBe('NOT_FOUND');
  });

  it('[B13] both refuse an anonymous caller before the service runs', async () => {
    const { user: guide } = await createUser({ role: 'guide' });
    await mockSession(null);

    const fromRoute = await callRoute(route, {
      path: `/profile?id=${String(guide._id)}`,
    });
    const fromAction = await profileAction(start, formFor(String(guide._id)));

    expect(fromRoute.status).toBe(401);
    expect((fromRoute.body as Envelope).error?.code).toBe('UNAUTHENTICATED');
    expect(fromAction.ok ? undefined : fromAction.error.code).toBe(
      'UNAUTHENTICATED',
    );
  });

  it('[B13] both refuse a malformed id with the same NOT_FOUND', async () => {
    const { user: traveller } = await createUser({ role: 'user' });
    await mockSession(traveller);

    const fromRoute = await callRoute(route, {
      path: '/profile?id=not-an-id',
      as: traveller,
    });
    const fromAction = await profileAction(start, formFor('not-an-id'));

    expect((fromRoute.body as Envelope).error?.code).toBe('NOT_FOUND');
    expect(fromAction.ok ? undefined : fromAction.error.code).toBe('NOT_FOUND');
  });
});
