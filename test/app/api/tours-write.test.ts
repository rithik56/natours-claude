// F6, S4, B4: the admin tour writes over JSON. PATCH changes only the editable fields, for a lead guide or an admin;
// POST and DELETE follow in the same file (plan 04-12). Every refusal is in the standard envelope.
import { describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/[id]/route';
import { list } from '@/server/modules/tours/service';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour, createUser } from '../../helpers/factories';
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

describe('PATCH /api/v1/tours/[id]', () => {
  useTestDatabase();

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
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
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
      expect(body.error.message).toBe('A tour with that name already exists.');
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
