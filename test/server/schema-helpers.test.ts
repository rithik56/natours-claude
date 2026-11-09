import bcrypt from 'bcryptjs';
import mongoose, { type Model } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { messages } from '@/lib/messages';
import { Booking } from '@/server/modules/bookings/model';
import { Review } from '@/server/modules/reviews/model';
import { Tour } from '@/server/modules/tours/model';
import { User } from '@/server/modules/users/model';
import { useTestDatabase } from '../helpers/db';
import {
  TEST_PASSWORD,
  createBooking,
  createReview,
  createTour,
  createUser,
} from '../helpers/factories';
import { seedUsers } from '../helpers/seed';

type AnyModel = Model<Record<string, unknown>>;

type RawDoc = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

type Case = {
  name: string;
  // The model is read through its collection so no model middleware is involved.
  model: AnyModel;
  // Creates one stored document and returns it as the raw collection holds it.
  create: () => Promise<RawDoc>;
  // A replacement document that breaks a validator or a password rule.
  invalid: (stored: RawDoc) => Record<string, unknown>;
  leaked: string;
};

async function raw(model: AnyModel, id: unknown): Promise<RawDoc | null> {
  const _id = (
    typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  ) as mongoose.Types.ObjectId;
  return (await model.collection.findOne({ _id })) as RawDoc | null;
}

/** The refusal names the operation (for example "User.replaceOne") and ADR 0027. */
async function expectRefusal(
  attempt: PromiseLike<unknown>,
  operation: string,
): Promise<void> {
  const error = await Promise.resolve(attempt).then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain(operation);
  expect((error as Error).message).toContain('ADR 0027');
}

const PLAIN = 'plain-text-pass-1';

const cases: Case[] = [
  {
    name: 'User',
    model: User as unknown as AnyModel,
    create: async () => {
      const { user } = await createUser({ role: 'admin' });
      return (await raw(User as unknown as AnyModel, user._id))!;
    },
    invalid: (stored) => ({
      name: stored.name,
      email: stored.email,
      role: 'admin',
      password: PLAIN,
      passwordChangedAt: new Date(),
    }),
    leaked: PLAIN,
  },
  {
    name: 'Tour',
    model: Tour as unknown as AnyModel,
    create: async () => {
      const tour = await createTour();
      return (await raw(Tour as unknown as AnyModel, tour._id))!;
    },
    invalid: (stored) => ({ ...stored, price: -5 }),
    leaked: '-5',
  },
  {
    name: 'Review',
    model: Review as unknown as AnyModel,
    create: async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const review = await createReview({ user, tour });
      return (await raw(Review as unknown as AnyModel, review._id))!;
    },
    invalid: (stored) => ({ ...stored, rating: 99 }),
    leaked: '99',
  },
  {
    name: 'Booking',
    model: Booking as unknown as AnyModel,
    create: async () => {
      const { user } = await createUser();
      const tour = await createTour();
      const booking = await createBooking({ user, tour });
      return (await raw(Booking as unknown as AnyModel, booking._id))!;
    },
    invalid: (stored) => ({ ...stored, price: -5, currency: 'usd' }),
    leaked: 'usd',
  },
];

describe('operations that skip validators are refused (WR-04, ADR 0027)', () => {
  useTestDatabase();

  describe.each(cases)('$name', (entry) => {
    it('[WR-04] replaceOne is refused and stores nothing', async () => {
      const stored = await entry.create();

      const attempt = entry.model.replaceOne(
        { _id: stored._id },
        entry.invalid(stored) as never,
      );

      await expectRefusal(attempt, `${entry.name}.replaceOne`);
      expect(await raw(entry.model, stored._id)).toEqual(stored);
    });

    it('[WR-04] findOneAndReplace is refused and stores nothing', async () => {
      const stored = await entry.create();

      const attempt = entry.model.findOneAndReplace(
        { _id: stored._id },
        entry.invalid(stored) as never,
      );

      await expectRefusal(attempt, `${entry.name}.findOneAndReplace`);
      expect(await raw(entry.model, stored._id)).toEqual(stored);
    });

    it('[WR-04] bulkWrite is refused for a replace, an update and an insert, and stores nothing', async () => {
      const stored = await entry.create();
      const before = await entry.model.collection.countDocuments();
      const invalid = entry.invalid(stored);
      const operations = [
        { replaceOne: { filter: { _id: stored._id }, replacement: invalid } },
        {
          updateOne: {
            filter: { _id: stored._id },
            update: { $set: invalid },
          },
        },
        {
          insertOne: {
            document: { ...invalid, _id: new mongoose.Types.ObjectId() },
          },
        },
      ];

      for (const operation of operations) {
        await expectRefusal(
          entry.model.bulkWrite([operation] as never),
          `${entry.name}.bulkWrite`,
        );
      }

      expect(await raw(entry.model, stored._id)).toEqual(stored);
      expect(await entry.model.collection.countDocuments()).toBe(before);
    });

    it('[WR-04] the refusal names the operation and the model and carries no document data', async () => {
      const stored = await entry.create();

      const error = await entry.model
        .replaceOne({ _id: stored._id }, entry.invalid(stored) as never)
        .then(
          () => null,
          (caught: unknown) => caught,
        );

      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toContain(`${entry.name}.replaceOne`);
      expect(message).not.toContain(entry.leaked);
    });
  });

  describe('User.insertMany keeps working and never stores a plain password', () => {
    const person = () => seedUsers().filter((entry) => entry.role === 'user');

    it('[WR-04] stores a bcrypt hash, read from the raw collection', async () => {
      const [first, second] = person();

      await User.insertMany([
        { ...first!, password: TEST_PASSWORD },
        { ...second!, password: TEST_PASSWORD },
      ]);

      for (const entry of [first!, second!]) {
        const stored = await raw(User as unknown as AnyModel, entry._id);
        const hash = stored?.password as string;
        expect(hash).toMatch(/^\$2/);
        expect(hash).not.toBe(TEST_PASSWORD);
        expect(await bcrypt.compare(TEST_PASSWORD, hash)).toBe(true);
        expect(bcrypt.getRounds(hash)).toBe(4);
        expect(stored).not.toHaveProperty('passwordChangedAt');
      }
    });

    it('[WR-04] refuses a document that supplies passwordChangedAt and stores nothing', async () => {
      const [first, second] = person();

      await expect(
        User.insertMany([
          { ...first!, password: TEST_PASSWORD },
          {
            ...second!,
            password: TEST_PASSWORD,
            passwordChangedAt: new Date(),
          },
        ]),
      ).rejects.toThrow(/passwordChangedAt/);

      expect(await User.collection.countDocuments()).toBe(0);
    });

    it('[WR-04] rejects 25 Devanagari characters (75 bytes) and stores nothing', async () => {
      const [first, second] = person();

      await expect(
        User.insertMany([
          { ...first!, password: TEST_PASSWORD },
          { ...second!, password: 'क'.repeat(25) },
        ]),
      ).rejects.toMatchObject({
        name: 'ValidationError',
        errors: {
          password: { message: messages.validation.passwordTooLong },
        },
      });

      expect(await User.collection.countDocuments()).toBe(0);
    });

    it('[WR-04] rejects a one-document batch with a password under 8 characters', async () => {
      const [first] = person();

      await expect(
        User.insertMany([{ ...first!, password: 'short' }]),
      ).rejects.toMatchObject({ name: 'ValidationError' });

      expect(await User.collection.countDocuments()).toBe(0);
    });

    it('[WR-04] accepts 24 Devanagari characters (72 bytes) and hashes them', async () => {
      const [first] = person();
      const password = 'क'.repeat(24);

      await User.insertMany([{ ...first!, password }]);

      const stored = await raw(User as unknown as AnyModel, first!._id);
      expect(await bcrypt.compare(password, stored?.password as string)).toBe(
        true,
      );
    });

    it('[WR-04] hashes a single document, and with ordered: false and lean: true', async () => {
      const [first, second, third] = person();

      await User.insertMany({ ...first!, password: TEST_PASSWORD } as never);
      await User.insertMany([{ ...second!, password: TEST_PASSWORD }], {
        ordered: false,
      });
      await User.insertMany([{ ...third!, password: TEST_PASSWORD }], {
        lean: true,
      });

      for (const entry of [first!, second!, third!]) {
        const stored = await raw(User as unknown as AnyModel, entry._id);
        expect(stored?.password).toMatch(/^\$2/);
      }
    });

    it('[WR-04] one rejected document stores nothing even with ordered: false', async () => {
      const [first, second] = person();

      await expect(
        User.insertMany(
          [
            { ...first!, password: TEST_PASSWORD },
            { ...second!, password: 'short' },
          ],
          { ordered: false },
        ),
      ).rejects.toMatchObject({ name: 'ValidationError' });

      expect(await User.collection.countDocuments()).toBe(0);
    });

    it('[WR-04] the stored user can sign in as if saved, with the one cost', async () => {
      const [first] = person();
      await User.insertMany([{ ...first!, password: TEST_PASSWORD }]);

      const loaded = await User.findById(first!._id).select('+password');

      expect(await bcrypt.compare(TEST_PASSWORD, loaded?.password ?? '')).toBe(
        true,
      );
    });
  });

  describe('a per-call middleware: false does not switch the guards off', () => {
    const off = { middleware: false } as never;

    it('[WR-04] updateOne still refuses a password write', async () => {
      const { user } = await createUser();

      await expect(
        User.updateOne({ _id: user._id }, { $set: { password: PLAIN } }, off),
      ).rejects.toThrow(/User\.save\(\)/);
    });

    it('[WR-04] replaceOne and bulkWrite are still refused', async () => {
      const stored = await cases[3]!.create();
      const invalid = cases[3]!.invalid(stored);

      await expectRefusal(
        Booking.replaceOne({ _id: stored._id }, invalid as never, off),
        'Booking.replaceOne',
      );
      await expectRefusal(
        Booking.bulkWrite(
          [
            {
              replaceOne: { filter: { _id: stored._id }, replacement: invalid },
            },
          ] as never,
          off,
        ),
        'Booking.bulkWrite',
      );
    });

    it('[WR-04] create still hashes the password', async () => {
      const [first] = seedUsers();

      await User.create([{ ...first!, password: TEST_PASSWORD }], off);

      const stored = await raw(User as unknown as AnyModel, first!._id);
      expect(stored?.password).toMatch(/^\$2/);
    });

    it('[WR-04] insertMany still hashes the password', async () => {
      const [first] = seedUsers();

      await User.insertMany([{ ...first!, password: TEST_PASSWORD }], off);

      const stored = await raw(User as unknown as AnyModel, first!._id);
      expect(stored?.password).toMatch(/^\$2/);
    });
  });

  describe('update queries cannot write the password through any operator (B14)', () => {
    const message = /User\.save\(\)/;

    it.each([
      ['$rename into password', { $rename: { name: 'password' } }],
      [
        '$rename into passwordChangedAt',
        { $rename: { name: 'passwordChangedAt' } },
      ],
      ['$set on password', { $set: { password: PLAIN } }],
      ['$setOnInsert on password', { $setOnInsert: { password: PLAIN } }],
      ['$unset on password', { $unset: { password: '' } }],
      [
        '$set on passwordChangedAt',
        { $set: { passwordChangedAt: new Date() } },
      ],
      ['a pipeline $set on password', [{ $set: { password: PLAIN } }]],
      [
        'a pipeline $replaceRoot carrying password',
        [{ $replaceRoot: { newRoot: { password: PLAIN } } }],
      ],
      [
        'a pipeline $replaceWith carrying password',
        [{ $replaceWith: { password: PLAIN } }],
      ],
      ['a pipeline $unset of password', [{ $unset: 'password' }]],
      ['a pipeline $unset list with password', [{ $unset: ['password'] }]],
    ])('[B14] updateOne refuses %s', async (_label, update) => {
      const { user } = await createUser();
      const stored = await raw(User as unknown as AnyModel, user._id);

      await expect(
        User.updateOne({ _id: user._id }, update as never, {
          updatePipeline: Array.isArray(update),
        }),
      ).rejects.toThrow(message);

      expect(await raw(User as unknown as AnyModel, user._id)).toEqual(stored);
    });

    it('[B14] an upsert that would create a user with a password is refused', async () => {
      await expect(
        User.updateOne(
          { email: 'nobody-here@example.com' },
          { $setOnInsert: { password: PLAIN } },
          { upsert: true },
        ),
      ).rejects.toThrow(message);

      expect(await User.collection.countDocuments()).toBe(0);
    });

    it('[B14] findOneAndUpdate and updateMany refuse a $rename into password', async () => {
      const { user } = await createUser();

      await expect(
        User.findOneAndUpdate(
          { _id: user._id },
          { $rename: { name: 'password' } },
        ),
      ).rejects.toThrow(message);
      await expect(
        User.updateMany({}, { $rename: { name: 'password' } }),
      ).rejects.toThrow(message);
    });

    it('[B14] an ordinary update still works', async () => {
      const { user } = await createUser();

      await User.updateOne({ _id: user._id }, { $set: { name: 'Renamed' } });

      expect((await User.findById(user._id))?.name).toBe('Renamed');
    });
  });
});
