// B12, B13: GET /api/v1/tours/[id] answers the tour with its public guides, the same tour the page shows,
// a 400 for a malformed id and a 404 for an unknown one, in the standard envelope.
import { describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/[id]/route';
import { getBySlug } from '@/server/modules/tours/service';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour } from '../../helpers/factories';
import { seedTours, seedUsers } from '../../helpers/seed';

const VALLEY = 'valley-of-flowers-trek';
const UNKNOWN_ID = '0123456789abcdef01234567';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DetailBody = {
  status: string;
  data: { tour: Record<string, unknown> & { guides: unknown[] } };
};

type ErrorBody = {
  status: string;
  error: { code: string; requestId: string };
};

function seedIdOf(slug: string): string {
  return seedTours().find((tour) => tour.slug === slug)!._id;
}

async function getDetail(id: string) {
  return callRoute(route, { path: `/api/v1/tours/${id}`, params: { id } });
}

describe('GET /api/v1/tours/[id]', () => {
  useTestDatabase();

  it('[B12] answers 200 with the tour, whose guides hold exactly id, name, photo and role', async () => {
    await createTour({ slug: VALLEY, withGuides: true });

    const response = await getDetail(seedIdOf(VALLEY));
    const body = response.body as DetailBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.tour.name).toBe('Valley of Flowers Trek');
    expect(body.data.tour.guides.length).toBeGreaterThan(0);
    for (const guide of body.data.tour.guides) {
      expect(Object.keys(guide as object).sort()).toEqual([
        'id',
        'name',
        'photo',
        'role',
      ]);
    }
  });

  it('[B12] the guides keep the lead guide first, then the tour order', async () => {
    await createTour({ slug: VALLEY, withGuides: true });
    const seeded = seedTours().find((tour) => tour.slug === VALLEY)!;

    const body = (await getDetail(seeded._id)).body as DetailBody;
    const ids = body.data.tour.guides.map(
      (guide) => (guide as { id: string }).id,
    );

    expect(ids[0]).toBe(seeded.guides[0]);
    expect(ids).toEqual(seeded.guides);
  });

  it('[B13] the tour without its guides is the tour the page shows for the same slug', async () => {
    await createTour({ slug: VALLEY, withGuides: true });

    const body = (await getDetail(seedIdOf(VALLEY))).body as DetailBody;
    const fromApi: Record<string, unknown> = { ...body.data.tour };
    delete fromApi.guides;
    const fromPage = await getBySlug(VALLEY);

    expect(fromApi).toEqual(JSON.parse(JSON.stringify(fromPage)));
  });

  it('[S3] no guide email reaches the body', async () => {
    await createTour({ slug: VALLEY, withGuides: true });
    const guideEmails = seedUsers()
      .filter((person) =>
        seedTours()
          .find((t) => t.slug === VALLEY)!
          .guides.includes(person._id),
      )
      .map((person) => person.email);

    const response = await getDetail(seedIdOf(VALLEY));

    for (const email of guideEmails) {
      expect(JSON.stringify(response.body)).not.toContain(email);
    }
  });

  it('[B12] a tour whose guides are all missing answers guides: [] and does not throw', async () => {
    await createTour({ slug: VALLEY });

    const response = await getDetail(seedIdOf(VALLEY));

    expect(response.status).toBe(200);
    expect((response.body as DetailBody).data.tour.guides).toEqual([]);
  });

  it('[B12] a malformed id is a 400 VALIDATION_ERROR in the standard envelope, with a requestId', async () => {
    const response = await getDetail('not-an-id');
    const body = response.body as ErrorBody;

    expect(response.status).toBe(400);
    expect(body.status).toBe('fail');
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.requestId).toMatch(UUID);
  });

  it('[B12] a well-formed id that no tour has is a 404 NOT_FOUND in the standard envelope, with a requestId', async () => {
    const response = await getDetail(UNKNOWN_ID);
    const body = response.body as ErrorBody;

    expect(response.status).toBe(404);
    expect(body.status).toBe('fail');
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toMatch(UUID);
  });
});
