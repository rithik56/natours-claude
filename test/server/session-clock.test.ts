import { decodeJwt } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { User } from '@/server/modules/users/model';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  getCurrentUser,
  getSession,
  signSession,
  type CookieReader,
} from '@/server/session';
import { useTestDatabase } from '../helpers/db';
import { createUser } from '../helpers/factories';

// The session layer and the User model both read the one clock, so the test
// moves that clock directly. Every APP_NOW value ends up here (WR-08).
const clock = vi.hoisted(() => ({ at: new Date() }));
vi.mock('@/server/clock', () => ({ now: () => clock.at }));

const SECOND_MS = 1000;
const DAY_MS = 24 * 60 * 60 * SECOND_MS;

// One pinned date far ahead of the real clock and one far behind it, so a
// layer that still reads the wall clock fails in at least one of them.
const PINNED = [
  { label: 'later than the real clock', start: '2035-06-01T10:00:00+05:30' },
  { label: 'earlier than the real clock', start: '2020-06-01T10:00:00+05:30' },
] as const;

function reader(token: string): CookieReader {
  return {
    get: (name) => (name === SESSION_COOKIE ? { value: token } : undefined),
  };
}

function pinAt(start: string, offsetMs = 0): void {
  clock.at = new Date(new Date(start).getTime() + offsetMs);
}

describe('the one clock in the session layer (WR-08)', () => {
  useTestDatabase();

  afterEach(() => {
    clock.at = new Date();
  });

  describe.each(PINNED)('session clock when APP_NOW is $label', ({ start }) => {
    it('[S14] signs iat and exp from the pinned clock', async () => {
      pinAt(start);
      const claims = decodeJwt(await signSession('a-user-id'));

      expect(claims.iat).toBe(
        Math.floor(new Date(start).getTime() / SECOND_MS),
      );
      expect(claims.exp).toBe((claims.iat ?? 0) + SESSION_MAX_AGE_SECONDS);
    });

    it('[S14] expiry follows the pinned clock: valid just inside 7 days, refused just past it', async () => {
      pinAt(start);
      const token = await signSession('a-user-id');

      pinAt(start, 7 * DAY_MS - SECOND_MS);
      expect(await getSession(reader(token))).not.toBeNull();

      pinAt(start, 7 * DAY_MS + SECOND_MS);
      expect(await getSession(reader(token))).toBeNull();
    });

    it('[SEC-18] a token signed after a password change is accepted and one signed before it is refused', async () => {
      const { user } = await createUser();
      const id = String(user._id);
      pinAt(start);
      const before = await signSession(id);

      pinAt(start, 10 * SECOND_MS);
      const loaded = await User.findById(id).select('+password');
      loaded!.password = 'A-different-passphrase-2027';
      await loaded!.save();
      const changedAt = (await User.findById(id))?.passwordChangedAt;
      expect(changedAt?.getTime()).toBe(new Date(start).getTime() + 10_000);

      pinAt(start, 20 * SECOND_MS);
      const after = await signSession(id);

      expect((await getCurrentUser(reader(after)))?.id).toBe(id);
      expect(await getCurrentUser(reader(before))).toBeNull();
    });
  });
});
