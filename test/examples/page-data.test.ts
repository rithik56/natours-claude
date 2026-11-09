// Example: how to test the data function behind a page. Later phases copy this shape.
// No feature page exists yet, so the functions under test are fixtures defined here.
import { Types } from 'mongoose';
import { notFound } from 'next/navigation';
import { describe, expect, it } from 'vitest';
import { toPublicUser, toSelf } from '@/server/modules/users/dto';
import { findActiveById } from '@/server/modules/users/service';
import { requireUser } from '@/server/session';
import { useTestDatabase } from '../helpers/db';
import { createUser } from '../helpers/factories';
import { mockSession } from '../helpers/mock-session';
import { seedUsers } from '../helpers/seed';

// A page for logged-in users: anyone else is sent to log in and brought back here.
async function loadAccountPage() {
  const user = await requireUser({ next: '/me' });
  return { user };
}

// A page for public data: a missing record is a 404, not an error (B9, B18).
async function loadGuidePage(id: string) {
  const record = await findActiveById(id);
  if (!record) notFound();
  return { guide: toPublicUser(record) };
}

function digestOf(error: unknown): string {
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' ? digest : 'no digest';
}

async function failureOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    return digestOf(error);
  }
}

describe('example: a page data function', () => {
  useTestDatabase();

  it('[Q6] returns the logged-in seed person in the self shape', async () => {
    const { user } = await createUser({ role: 'user' });
    const person = seedUsers().find((entry) => entry._id === String(user._id));
    await mockSession(user);

    const page = await loadAccountPage();

    expect(Object.keys(page.user).sort()).toEqual([
      'email',
      'id',
      'name',
      'photo',
      'role',
    ]);
    expect(page.user.email).toBe(person?.email);
    expect(page.user).toEqual(toSelf(user));
  });

  it('[Q6] sends an anonymous visitor to /login with the page to return to', async () => {
    await mockSession(null);

    const digest = await failureOf(loadAccountPage());

    expect(digest.startsWith('NEXT_REDIRECT;')).toBe(true);
    expect(digest.includes('/login?next=%2Fme')).toBe(true);
  });

  it('[Q6] sends a deactivated account to /login too, even with a valid cookie', async () => {
    const { user } = await createUser({ role: 'user', active: false });
    await mockSession(user);

    const digest = await failureOf(loadAccountPage());

    expect(digest.includes('/login?next=%2Fme')).toBe(true);
  });

  it('[Q6] a guide page shows the guide as a public DTO without an email', async () => {
    const { user: guide } = await createUser({ role: 'guide' });

    const page = await loadGuidePage(String(guide._id));

    expect(page.guide).toEqual(toPublicUser(guide));
    expect(JSON.stringify(page).includes(guide.email)).toBe(false);
  });

  it('[Q6] a guide page for an id that matches nobody is a 404', async () => {
    const digest = await failureOf(
      loadGuidePage(new Types.ObjectId().toString()),
    );

    expect(digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
