// The admin tour writes over JSON, covering requirements F6, S4 and B4 and decision D-16. The three
// writes are POST, PATCH and DELETE on the tour routes, and every refusal is in the standard error envelope.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as collection from '@/app/api/v1/tours/route';
import * as route from '@/app/api/v1/tours/[id]/route';
import { getLogger } from '@/server/logger';
import { Review } from '@/server/modules/reviews/model';
import { Tour } from '@/server/modules/tours/model';
import {
  distancesFrom,
  getBySlug,
  getStats,
  list,
  listCredits,
  listSlugs,
  toursWithin,
} from '@/server/modules/tours/service';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import {
  createBooking,
  createReview,
  createTour,
  createUser,
} from '../../helpers/factories';
import { fakes } from '../../helpers/fakes';
import { seedTours } from '../../helpers/seed';

const VALLEY = 'valley-of-flowers-trek';
const KEDARKANTHA = 'kedarkantha-winter-trek';
const UNKNOWN_ID = '0123456789abcdef01234567';
const EVERYTHING = {
  sort: ['-createdAt'],
  page: 1,
  limit: 100,
  clampPage: false,
  filters: [],
};

type TourBody = {
  status: string;
  data: { tour: Record<string, unknown> & { guides: unknown[] } };
};

type ErrorBody = {
  status: string;
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
};

type WriteUser = { _id: unknown };

function seedIdOf(slug: string): string {
  return seedTours().find((tour) => tour.slug === slug)!._id;
}

function seedNameOf(slug: string): string {
  return seedTours().find((tour) => tour.slug === slug)!.name;
}

async function patch(
  id: string,
  body: unknown,
  as?: WriteUser,
  origin?: string | null,
) {
  return callRoute(route, {
    method: 'PATCH',
    path: `/api/v1/tours/${id}`,
    params: { id },
    body,
    as,
    origin,
  });
}

function pathsOf(body: ErrorBody): string[] {
  return (body.error.details ?? []).map((detail) => detail.path);
}

const HAMPI = 'hampi-ruins-and-boulders';

// The seed record with the fields a create body takes. The seed JSON also has photos, credits,
// ratings, guides and a GeoJSON `type`, none of which a create body may send.
type FullSeedTour = {
  name: string;
  duration: number;
  maxGroupSize: number;
  difficulty: string;
  price: number;
  summary: string;
  description: string;
  startDates: string[];
  startLocation: {
    coordinates: number[];
    address: string;
    description: string;
  };
  locations: Array<{ coordinates: number[]; description: string; day: number }>;
};

function seedRecordOf(slug: string): FullSeedTour {
  return seedTours().find(
    (tour) => tour.slug === slug,
  ) as unknown as FullSeedTour;
}

/** A create body from a real seed record: its name, route, dates and places, with no photos or guides. */
function createBodyFor(slug: string): Record<string, unknown> {
  const record = seedRecordOf(slug);
  return {
    name: record.name,
    duration: record.duration,
    maxGroupSize: record.maxGroupSize,
    difficulty: record.difficulty,
    price: record.price,
    summary: record.summary,
    description: record.description,
    startDates: record.startDates,
    startLocation: {
      coordinates: record.startLocation.coordinates,
      address: record.startLocation.address,
      description: record.startLocation.description,
    },
    locations: record.locations.map((stop) => ({
      coordinates: stop.coordinates,
      description: stop.description,
      day: stop.day,
    })),
  };
}

async function create(body: unknown, as?: WriteUser, origin?: string | null) {
  return callRoute(collection, {
    method: 'POST',
    path: '/api/v1/tours',
    body,
    as,
    origin,
  });
}

async function remove(id: string, as?: WriteUser, origin?: string | null) {
  return callRoute(route, {
    method: 'DELETE',
    path: `/api/v1/tours/${id}`,
    params: { id },
    as,
    origin,
  });
}

describe('admin tour writes over JSON (F6, B4, D-13)', () => {
  // One database for the file: every write block below shares it.
  useTestDatabase();

  describe('PATCH /api/v1/tours/[id]', () => {
    it('[S16] a JSON body above 1 MB is 413 before it is parsed (SEC-17)', async () => {
      await createTour({ slug: VALLEY });
      const { user: admin } = await createUser({ role: 'admin' });
      const padded = { summary: 'x'.repeat(1_100_000) };

      const response = await patch(seedIdOf(VALLEY), padded, admin);

      expect(response.status).toBe(413);
      expect((response.body as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    describe('who may write (F6, D-16)', () => {
      it('[F6] an anonymous caller gets 401 UNAUTHENTICATED', async () => {
        await createTour({ slug: VALLEY });
        const response = await patch(seedIdOf(VALLEY), { price: 15999 });
        expect(response.status).toBe(401);
        expect((response.body as ErrorBody).error.code).toBe('UNAUTHENTICATED');
      });

      it('[F6] a user gets 403 FORBIDDEN', async () => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'user' });
        const response = await patch(seedIdOf(VALLEY), { price: 15999 }, user);
        expect(response.status).toBe(403);
        expect((response.body as ErrorBody).error.code).toBe('FORBIDDEN');
      });

      it('[F6] a guide gets 403 FORBIDDEN, because the write is for lead guides and admins only', async () => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'guide' });
        const response = await patch(seedIdOf(VALLEY), { price: 15999 }, user);
        expect(response.status).toBe(403);
      });

      it("[F6] a write from another site's Origin is 403, even for a lead guide (S9)", async () => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'lead-guide' });
        const response = await patch(
          seedIdOf(VALLEY),
          { price: 15999 },
          user,
          'https://other-site.example',
        );
        expect(response.status).toBe(403);
      });

      it('[F6] a lead guide and an admin may change any tour, whoever guides it', async () => {
        await createTour({ slug: VALLEY });
        const { user: leadGuide } = await createUser({ role: 'lead-guide' });
        const { user: admin } = await createUser({ role: 'admin' });
        const id = seedIdOf(VALLEY);

        expect((await patch(id, { price: 15999 }, leadGuide)).status).toBe(200);
        expect((await patch(id, { price: 16999 }, admin)).status).toBe(200);
      });
    });

    describe('the change and its effects (F6, QA-04)', () => {
      it('[F6] a lead guide changes a seed tour price: 200, list() shows the new price, and the tags are cleared', async () => {
        await createTour({ slug: VALLEY });
        const id = seedIdOf(VALLEY);
        const { user } = await createUser({ role: 'lead-guide' });

        const response = await patch(id, { price: 15999 }, user);

        expect(response.status).toBe(200);
        const result = await list(EVERYTHING);
        expect(result.items.find((tour) => tour.id === id)?.price).toBe(15999);
        expect(fakes.cache.invalidated).toEqual(['tours', `tour:${id}`]);
      });

      it('[QA-04] renaming a tour regenerates its slug', async () => {
        await createTour({ slug: VALLEY });
        const id = seedIdOf(VALLEY);
        const { user } = await createUser({ role: 'lead-guide' });

        const response = await patch(
          id,
          { name: 'Valley of Flowers Grand Trek' },
          user,
        );

        const body = response.body as TourBody;
        expect(response.status).toBe(200);
        expect(body.data.tour.slug).toBe('valley-of-flowers-grand-trek');
        const result = await list(EVERYTHING);
        expect(result.items.find((tour) => tour.id === id)?.slug).toBe(
          'valley-of-flowers-grand-trek',
        );
      });

      it('[F6] the same PATCH sent twice leaves the same document and slug', async () => {
        await createTour({ slug: VALLEY });
        const id = seedIdOf(VALLEY);
        const { user } = await createUser({ role: 'lead-guide' });
        const change = { name: 'Valley of Flowers Grand Trek', price: 15999 };

        const first = (await patch(id, change, user)).body as TourBody;
        const second = (await patch(id, change, user)).body as TourBody;

        expect(second.data.tour.slug).toBe(first.data.tour.slug);
        expect(second.data.tour.price).toBe(first.data.tour.price);
        expect(second.data.tour.name).toBe(first.data.tour.name);
        expect((await list(EVERYTHING)).items).toHaveLength(1);
      });
    });

    describe('the editable fields only (B4, S4)', () => {
      it.each([
        ['images', ['tours/a.jpg']],
        ['imageCover', 'tours/a.jpg'],
        ['photoCredits', []],
        ['slug', 'hijacked-slug'],
        ['ratingsAverage', 5],
        ['ratingsQuantity', 99],
        ['ImageCover', 'tours/a.jpg'],
      ])(
        '[B4] PATCH with %s is 400 VALIDATION_ERROR naming that path',
        async (field, value) => {
          await createTour({ slug: VALLEY });
          const { user } = await createUser({ role: 'lead-guide' });

          const response = await patch(
            seedIdOf(VALLEY),
            { [field]: value },
            user,
          );

          const body = response.body as ErrorBody;
          expect(response.status).toBe(400);
          expect(body.error.code).toBe('VALIDATION_ERROR');
          expect(pathsOf(body)).toEqual([field]);
        },
      );

      it('[S4] an empty object is 400', async () => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'lead-guide' });
        const response = await patch(seedIdOf(VALLEY), {}, user);
        expect(response.status).toBe(400);
        expect((response.body as ErrorBody).error.code).toBe(
          'VALIDATION_ERROR',
        );
      });

      it('[S4] a body with two unknown keys lists the path of both', async () => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'lead-guide' });

        const response = await patch(
          seedIdOf(VALLEY),
          { colour: 'red', ImageCover: 'tours/a.jpg', price: 15999 },
          user,
        );

        const body = response.body as ErrorBody;
        expect(response.status).toBe(400);
        expect(pathsOf(body)).toEqual(
          expect.arrayContaining(['colour', 'ImageCover']),
        );
        expect(pathsOf(body)).toHaveLength(2);
      });

      it('[S4] field names match exactly: a lower-case ratingsaverage is an unknown key', async () => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'lead-guide' });
        const response = await patch(
          seedIdOf(VALLEY),
          { ratingsaverage: 5 },
          user,
        );
        expect(response.status).toBe(400);
        expect(pathsOf(response.body as ErrorBody)).toEqual(['ratingsaverage']);
      });
    });

    describe('name length (S4)', () => {
      it.each([
        [9, 400],
        [10, 200],
        [40, 200],
        [41, 400],
      ])('[S4] a name of %i characters is %i', async (length, status) => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role: 'lead-guide' });

        const response = await patch(
          seedIdOf(VALLEY),
          { name: 'A'.repeat(length) },
          user,
        );

        expect(response.status).toBe(status);
      });
    });

    describe('duplicate names and guides (copy.md, B12)', () => {
      it('[F6] a name another tour already has is 409 with the approved message', async () => {
        await createTour({ slug: VALLEY });
        await createTour({ slug: KEDARKANTHA });
        const { user } = await createUser({ role: 'lead-guide' });

        const response = await patch(
          seedIdOf(VALLEY),
          { name: seedNameOf(KEDARKANTHA) },
          user,
        );

        const body = response.body as ErrorBody;
        expect(response.status).toBe(409);
        expect(body.error.code).toBe('CONFLICT');
        expect(body.error.message).toBe(
          'A tour with that name already exists.',
        );
      });

      it('[B12] a guide id that belongs to a traveller is 400 on the guides path', async () => {
        await createTour({ slug: VALLEY });
        const { user: lead } = await createUser({ role: 'lead-guide' });
        const { user: traveller } = await createUser({ role: 'user' });

        const response = await patch(
          seedIdOf(VALLEY),
          { guides: [String(traveller._id)] },
          lead,
        );

        expect(response.status).toBe(400);
        expect(pathsOf(response.body as ErrorBody)).toEqual(['guides']);
      });

      it('[B12] a guide id that is an active guide is accepted and listed on the tour', async () => {
        await createTour({ slug: VALLEY });
        const { user: lead } = await createUser({ role: 'lead-guide' });
        const { user: guide } = await createUser({ role: 'guide' });

        const response = await patch(
          seedIdOf(VALLEY),
          { guides: [String(guide._id)] },
          lead,
        );

        const body = response.body as TourBody;
        expect(response.status).toBe(200);
        expect(body.data.tour.guides).toHaveLength(1);
      });
    });

    describe('the id (B12)', () => {
      it('[F6] an unknown id is 404 NOT_FOUND', async () => {
        const { user } = await createUser({ role: 'lead-guide' });
        const response = await patch(UNKNOWN_ID, { price: 15999 }, user);
        expect(response.status).toBe(404);
        expect((response.body as ErrorBody).error.code).toBe('NOT_FOUND');
      });

      it('[B12] a malformed id is 400 before any read', async () => {
        const { user } = await createUser({ role: 'lead-guide' });
        const response = await patch('bad', { price: 15999 }, user);
        expect(response.status).toBe(400);
      });
    });
  });

  describe('POST /api/v1/tours (F6, D-13)', () => {
    it('[F6] an admin creates a tour from JSON with no cover: 201, imageCover null, and only the tours tag is cleared', async () => {
      const { user } = await createUser({ role: 'admin' });

      const response = await create(createBodyFor(HAMPI), user);

      const body = response.body as TourBody;
      expect(response.status).toBe(201);
      expect(body.data.tour.slug).toBe(HAMPI);
      expect(body.data.tour.imageCover).toBeNull();
      expect(fakes.cache.invalidated).toEqual(['tours']);
    });

    it('[F6] (D-13) a cover-less tour stays out of every public read until a cover is added', async () => {
      await createTour({ slug: VALLEY });
      const { user } = await createUser({ role: 'admin' });
      const created = (await create(createBodyFor(HAMPI), user))
        .body as TourBody;
      const id = created.data.tour.id as string;
      const [lng, lat] = seedRecordOf(HAMPI).startLocation.coordinates as [
        number,
        number,
      ];
      const nearby = { lat, lng, distance: 50, unit: 'km' as const };

      expect(
        (await list(EVERYTHING)).items.map((tour) => tour.id),
      ).not.toContain(id);
      expect(await listSlugs()).not.toContain(HAMPI);
      expect((await listCredits()).map((group) => group.slug)).not.toContain(
        HAMPI,
      );
      expect(
        (await getStats()).reduce((total, row) => total + row.numTours, 0),
      ).toBe(1);
      expect((await toursWithin(nearby)).map((tour) => tour.id)).not.toContain(
        id,
      );
      expect(
        (await distancesFrom({ lat, lng, unit: 'km' })).map((tour) => tour.id),
      ).not.toContain(id);
      expect(await getBySlug(HAMPI)).toBeNull();
      const detail = await callRoute(route, {
        path: `/api/v1/tours/${id}`,
        params: { id },
      });
      expect(detail.status).toBe(200);
      expect((detail.body as TourBody).data.tour.imageCover).toBeNull();

      // Control: the same reads include the tour once it has a cover, so the exclusion is the
      // cover rule and not an empty result.
      await Tour.updateOne(
        { _id: id },
        { imageCover: 'tours/hampi-cover.jpg' },
      );
      expect((await list(EVERYTHING)).items.map((tour) => tour.id)).toContain(
        id,
      );
      expect((await toursWithin(nearby)).map((tour) => tour.id)).toContain(id);
      expect(
        (await distancesFrom({ lat, lng, unit: 'km' })).map((tour) => tour.id),
      ).toContain(id);
    });

    it.each([
      ['imageCover', 'tours/hampi-cover.jpg'],
      ['images', ['tours/a.jpg']],
      ['photoCredits', []],
    ])(
      '[B4] POST with %s is 400 VALIDATION_ERROR naming that path',
      async (field, value) => {
        const { user } = await createUser({ role: 'admin' });

        const response = await create(
          { ...createBodyFor(HAMPI), [field]: value },
          user,
        );

        const body = response.body as ErrorBody;
        expect(response.status).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(pathsOf(body)).toEqual([field]);
      },
    );

    it('[F6] a duplicate tour name is 409 with the approved message', async () => {
      const { user } = await createUser({ role: 'admin' });
      expect((await create(createBodyFor(HAMPI), user)).status).toBe(201);

      const response = await create(createBodyFor(HAMPI), user);

      const body = response.body as ErrorBody;
      expect(response.status).toBe(409);
      expect(body.error.message).toBe('A tour with that name already exists.');
    });

    it('[F6] an anonymous caller gets 401 and a user 403', async () => {
      const { user } = await createUser({ role: 'user' });

      expect((await create(createBodyFor(HAMPI))).status).toBe(401);
      expect((await create(createBodyFor(HAMPI), user)).status).toBe(403);
    });
  });

  describe('stored data stays sound (WR-01, WR-05)', () => {
    // A name with no ASCII letters or digits slugs to '', so the tour would have no reachable URL.
    it('[WR-01] a name with no Latin letters or digits is 400 on create and on rename', async () => {
      const { user } = await createUser({ role: 'admin' });
      const name = 'नमस्ते भारत यात्रा';

      const created = await create({ ...createBodyFor(HAMPI), name }, user);
      expect(created.status).toBe(400);
      expect(pathsOf(created.body as ErrorBody)).toEqual(['name']);

      await createTour({ slug: VALLEY });
      const renamed = await patch(seedIdOf(VALLEY), { name }, user);
      expect(renamed.status).toBe(400);
      expect(pathsOf(renamed.body as ErrorBody)).toEqual(['name']);
    });
  });

  describe('DELETE /api/v1/tours/[id] (F6, B4, D-16)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function storeFilesFor(tour: {
      imageCover?: string;
      images: string[];
    }) {
      const keys = [tour.imageCover as string, ...tour.images];
      for (const key of keys) {
        await fakes.storage.put(key, Buffer.from('photo'), 'image/jpeg');
      }
      return keys;
    }

    it('[F6] a tour with a booking answers 409 with the approved message, and the tour, its reviews and its photos stay', async () => {
      const tour = await createTour({ slug: VALLEY });
      const { user: lead } = await createUser({ role: 'lead-guide' });
      const { user: traveller } = await createUser({ role: 'user' });
      await createBooking({ user: traveller, tour, status: 'refunded' });
      await createReview({ user: traveller, tour });
      const keys = await storeFilesFor(tour);

      const response = await remove(String(tour._id), lead);

      const body = response.body as ErrorBody;
      expect(response.status).toBe(409);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toBe(
        "This tour has bookings, so it can't be deleted.",
      );
      expect(await Tour.countDocuments({ _id: tour._id })).toBe(1);
      expect(await Review.countDocuments({ tour: tour._id })).toBe(1);
      for (const key of keys) {
        expect(fakes.storage.files.has(key)).toBe(true);
      }
    });

    it('[F6] a tour with no booking answers 204, and its reviews and stored photos go with it', async () => {
      const tour = await createTour({ slug: VALLEY });
      const { user: lead } = await createUser({ role: 'lead-guide' });
      const { user: reviewer } = await createUser({ role: 'user' });
      await createReview({ user: reviewer, tour });
      const keys = await storeFilesFor(tour);
      const id = String(tour._id);

      const response = await remove(id, lead);

      expect(response.status).toBe(204);
      expect(await Tour.countDocuments({ _id: tour._id })).toBe(0);
      expect(await Review.countDocuments({ tour: tour._id })).toBe(0);
      for (const key of keys) {
        expect(fakes.storage.files.has(key)).toBe(false);
      }
      expect(fakes.cache.invalidated).toEqual([
        'tours',
        `tour:${id}`,
        `reviews:${id}`,
      ]);
    });

    it('[F6] a storage delete that throws still answers 204, and the failure is logged', async () => {
      const tour = await createTour({ slug: VALLEY });
      const { user: lead } = await createUser({ role: 'lead-guide' });
      await storeFilesFor(tour);
      vi.spyOn(fakes.storage, 'delete').mockRejectedValueOnce(
        new Error('disk unavailable'),
      );
      const logged = vi.spyOn(getLogger(), 'error');

      const response = await remove(String(tour._id), lead);

      expect(response.status).toBe(204);
      expect(logged).toHaveBeenCalled();
      expect(await Tour.countDocuments({ _id: tour._id })).toBe(0);
    });

    it('[F6] a second DELETE of the same tour is 404', async () => {
      const tour = await createTour({ slug: VALLEY });
      const { user: lead } = await createUser({ role: 'lead-guide' });
      const id = String(tour._id);

      expect((await remove(id, lead)).status).toBe(204);
      const again = await remove(id, lead);
      expect(again.status).toBe(404);
      expect((again.body as ErrorBody).error.code).toBe('NOT_FOUND');
    });
  });

  describe('who may write, for each method (D-16, S1)', () => {
    it('[D-16] an anonymous caller gets 401 on POST, PATCH and DELETE', async () => {
      await createTour({ slug: VALLEY });
      const id = seedIdOf(VALLEY);

      expect((await create(createBodyFor(HAMPI))).status).toBe(401);
      expect((await patch(id, { price: 15999 })).status).toBe(401);
      expect((await remove(id)).status).toBe(401);
    });

    it.each([['user'], ['guide']] as const)(
      '[D-16] a %s gets 403 on POST, PATCH and DELETE',
      async (role) => {
        await createTour({ slug: VALLEY });
        const { user } = await createUser({ role });
        const id = seedIdOf(VALLEY);

        expect((await create(createBodyFor(HAMPI), user)).status).toBe(403);
        expect((await patch(id, { price: 15999 }, user)).status).toBe(403);
        expect((await remove(id, user)).status).toBe(403);
      },
    );

    it.each([['lead-guide'], ['admin']] as const)(
      '[D-16] a %s creates, changes and deletes tours: 201, 200 and 204',
      async (role) => {
        await createTour({ slug: VALLEY });
        await createTour({ slug: KEDARKANTHA });
        const { user } = await createUser({ role });

        expect((await create(createBodyFor(HAMPI), user)).status).toBe(201);
        expect(
          (await patch(seedIdOf(VALLEY), { price: 15999 }, user)).status,
        ).toBe(200);
        expect((await remove(seedIdOf(KEDARKANTHA), user)).status).toBe(204);
      },
    );
  });
});
