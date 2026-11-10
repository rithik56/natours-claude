import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/lib/messages';
import { User, type UserRecord } from '@/server/modules/users/model';
import { ROLES } from '@/server/roles';
import { useTestDatabase } from '../../../helpers/db';
import { TEST_PASSWORD, createUser } from '../../../helpers/factories';
import {
  seedBookings,
  seedReviews,
  seedTours,
  seedUsers,
} from '../../../helpers/seed';

describe('users data layer', () => {
  useTestDatabase();

  describe('User model', () => {
    describe('password and passwordChangedAt', () => {
      it('[B14] stores a bcrypt hash and no passwordChangedAt on creation', async () => {
        const { user } = await createUser({ role: 'user' });

        const stored = await User.findById(user._id).select('+password');

        expect(stored?.password).toMatch(/^\$2/);
        expect(stored?.password).not.toBe(TEST_PASSWORD);
        expect(
          await bcrypt.compare(TEST_PASSWORD, stored?.password ?? ''),
        ).toBe(true);
        expect(stored?.passwordChangedAt).toBeUndefined();
      });

      it('[B14] saving a user without changing the password leaves passwordChangedAt unchanged', async () => {
        const { user } = await createUser();
        const loaded = await User.findById(user._id);

        loaded!.name = 'Renamed Person';
        await loaded!.save();

        const reloaded = await User.findById(user._id);
        expect(reloaded?.name).toBe('Renamed Person');
        expect(reloaded?.passwordChangedAt).toBeUndefined();
      });

      it('[B14] changing the password sets passwordChangedAt in the hook, no earlier than the save began', async () => {
        const { user } = await createUser();
        const loaded = await User.findById(user._id).select('+password');
        const before = Date.now();

        loaded!.password = 'A-different-passphrase-2027';
        await loaded!.save();

        const reloaded = await User.findById(user._id).select('+password');
        expect(reloaded?.passwordChangedAt).toBeInstanceOf(Date);
        expect(reloaded?.passwordChangedAt?.getTime()).toBeGreaterThanOrEqual(
          before,
        );
        expect(reloaded?.password).toMatch(/^\$2/);
        expect(reloaded?.password).not.toBe('A-different-passphrase-2027');
      });

      it('[B14] rejects update queries that set password or passwordChangedAt', async () => {
        const { user } = await createUser();
        const filter = { _id: user._id };

        await expect(
          User.findOneAndUpdate(filter, { password: 'A-new-passphrase-2028' }),
        ).rejects.toThrow();
        await expect(
          User.updateOne(filter, { $set: { passwordChangedAt: new Date() } }),
        ).rejects.toThrow();
        await expect(
          User.updateMany(filter, {
            $set: { password: 'A-new-passphrase-2028' },
          }),
        ).rejects.toThrow();

        const stored = await User.findById(user._id).select('+password');
        expect(stored?.passwordChangedAt).toBeUndefined();
        expect(
          await bcrypt.compare(TEST_PASSWORD, stored?.password ?? ''),
        ).toBe(true);
      });

      describe('password length is measured in bytes (WR-03)', () => {
        // Devanagari letters take 3 bytes each in UTF-8, so 24 fill bcrypt's 72 bytes.
        const devanagari = (count: number) => 'क'.repeat(count);

        it('[B14] accepts 24 Devanagari characters (72 bytes)', async () => {
          const { user } = await createUser({ password: devanagari(24) });

          const stored = await User.findById(user._id).select('+password');
          expect(
            await bcrypt.compare(devanagari(24), stored?.password ?? ''),
          ).toBe(true);
        });

        it('[B14] rejects 25 Devanagari characters (75 bytes) with the friendly message', async () => {
          await expect(
            createUser({ password: devanagari(25) }),
          ).rejects.toMatchObject({
            name: 'ValidationError',
            errors: {
              password: {
                message: messages.validation.passwordTooLong,
              },
            },
          });
        });

        it('[B14] accepts 72 ASCII characters and rejects 73', async () => {
          const { user } = await createUser({ password: 'a'.repeat(72) });
          expect(await User.exists({ _id: user._id })).not.toBeNull();

          await expect(
            createUser({ role: 'admin', password: 'a'.repeat(73) }),
          ).rejects.toMatchObject({ name: 'ValidationError' });
        });

        it('[B14] save() does not silently accept a changed password past 72 bytes', async () => {
          const { user } = await createUser();
          const loaded = await User.findById(user._id).select('+password');
          loaded!.password = devanagari(25);

          await expect(loaded!.save()).rejects.toMatchObject({
            name: 'ValidationError',
          });

          const stored = await User.findById(user._id).select('+password');
          expect(
            await bcrypt.compare(TEST_PASSWORD, stored?.password ?? ''),
          ).toBe(true);
        });
      });
    });

    describe('validation on updates (QA-04)', () => {
      it('rejects a name that is one character too long', async () => {
        const { user } = await createUser();

        await expect(
          User.findOneAndUpdate({ _id: user._id }, { name: 'a'.repeat(51) }),
        ).rejects.toMatchObject({ name: 'ValidationError' });
      });

      it('rejects an invalid email', async () => {
        const { user } = await createUser();

        await expect(
          User.findOneAndUpdate({ _id: user._id }, { email: 'nikhil.bhatt' }),
        ).rejects.toMatchObject({ name: 'ValidationError' });
      });
    });

    describe('hidden fields', () => {
      it('[S3] findById returns no password, reset token, reset expiry or active field', async () => {
        const { user } = await createUser();

        const stored = await User.findById(user._id);
        const keys = Object.keys(stored!.toObject());

        for (const hidden of [
          'password',
          'passwordResetToken',
          'passwordResetExpires',
          'active',
        ]) {
          expect(keys).not.toContain(hidden);
        }
      });

      it('[S3] a lean read returns the UserRecord fields and nothing sensitive', async () => {
        const { user } = await createUser();

        const record = await User.findById(user._id).lean<UserRecord>();

        expect(Object.keys(record!).sort()).toEqual([
          '__v',
          '_id',
          'createdAt',
          'email',
          'name',
          'role',
          'updatedAt',
        ]);
      });

      it('[S3] selecting +password returns the hash', async () => {
        const { user } = await createUser();

        const stored = await User.findById(user._id).select('+password');

        expect(stored?.password).toMatch(/^\$2/);
      });
    });

    describe('registration and timestamps', () => {
      it('[B17] importing the model again after a module reset returns the registered model', async () => {
        vi.resetModules();

        const again = await import('@/server/modules/users/model');

        expect(again.User).toBe(User);
        expect(again.User.modelName).toBe('User');
      });

      it('[B5] a created user has createdAt and updatedAt from timestamps', async () => {
        const { user } = await createUser();

        const stored = await User.findById(user._id);

        expect(stored?.createdAt).toBeInstanceOf(Date);
        expect(stored?.updatedAt).toBeInstanceOf(Date);
      });

      it('only allows the four roles', () => {
        expect(ROLES).toEqual(['user', 'guide', 'lead-guide', 'admin']);
      });
    });
  });

  describe('createUser draws only on the seed people (D-08)', () => {
    it('returns the admin from the seed file with their example.com email', async () => {
      const { user } = await createUser({ role: 'admin' });

      expect(user.name).toBe('Nikhil Bhatt');
      expect(user.email).toBe('nikhil.bhatt@example.com');
      expect(user.role).toBe('admin');
    });

    it('returns two different seed lead guides on two calls', async () => {
      const first = await createUser({ role: 'lead-guide' });
      const second = await createUser({ role: 'lead-guide' });

      expect(first.user.email).not.toBe(second.user.email);
    });

    it('throws for an email that is not in the seed file', async () => {
      await expect(
        createUser({ email: 'not-in-seed@example.com' }),
      ).rejects.toThrow(/seed/);
    });

    it('every created user has a name and email that exist in the seed file', async () => {
      const created = await Promise.all([
        createUser({ role: 'user' }),
        createUser({ role: 'guide' }),
        createUser({ role: 'admin' }),
      ]);

      const people = seedUsers();
      for (const { user } of created) {
        expect(
          people.some(
            (person) =>
              person.name === user.name && person.email === user.email,
          ),
        ).toBe(true);
      }
    });

    it('applies passwordChangedAt through the raw collection and honours active', async () => {
      const stale = new Date('2026-01-05T04:30:00.000Z');

      const { user } = await createUser({
        active: false,
        passwordChangedAt: stale,
      });

      const stored = await User.findById(user._id).select('+active');
      expect(stored?.passwordChangedAt).toEqual(stale);
      expect(stored?.active).toBe(false);
    });
  });

  describe('seed readers', () => {
    it('read the counts documented in seed/README.md', () => {
      expect(seedUsers()).toHaveLength(35);
      expect(seedTours()).toHaveLength(13);
      expect(seedReviews()).toHaveLength(52);
      expect(seedBookings()).toHaveLength(58);
    });
  });
});
