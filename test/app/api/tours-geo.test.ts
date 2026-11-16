import { afterEach, describe, expect, it, vi } from 'vitest';
import * as distancesRoute from '@/app/api/v1/tours/distances/[latlng]/unit/[unit]/route';
import * as withinRoute from '@/app/api/v1/tours/within/[distance]/center/[latlng]/unit/[unit]/route';
import { Tour } from '@/server/modules/tours/model';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour } from '../../helpers/factories';
import { seedTours } from '../../helpers/seed';

type WithinBody = {
  status: string;
  data: { tours: Array<Record<string, unknown>> };
};

type DistancesBody = {
  status: string;
  data: {
    distances: Array<{ id: string; name: string; slug: string; distance: number }>;
  };
};

type ErrorBody = { status: string; error: { code: string } };

// Connaught Place, Delhi, as the path carries it: latitude first, then longitude.
const DELHI = '28.6139,77.209';

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

async function within(distance: string, latlng: string, unit: string) {
  return callRoute(withinRoute, {
    path: `/api/v1/tours/within/${distance}/center/${latlng}/unit/${unit}`,
    params: { distance, latlng, unit },
  });
}

async function distances(latlng: string, unit: string) {
  return callRoute(distancesRoute, {
    path: `/api/v1/tours/distances/${latlng}/unit/${unit}`,
    params: { latlng, unit },
  });
}

// One database for the whole file: useTestDatabase is called once per file (test/helpers/db.ts).
useTestDatabase();
afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/v1/tours/within/[distance]/center/[latlng]/unit/[unit]', () => {
  it('[B3] returns the seed tours whose start lies within 300 km of Delhi, as summaries', async () => {
    await createWholeCatalogue();

    const response = await within('300', DELHI, 'km');
    const body = response.body as WithinBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.tours.map((tour) => tour.name)).toEqual([
      'Golden Triangle Heritage',
      'Kedarkantha Winter Trek',
      'Rishikesh Ganga Rafting',
      'Valley of Flowers Trek',
    ]);
    expect(body.data.tours[0]).toHaveProperty('startDates');
    expect(body.data.tours[0]).toHaveProperty('startLocation');
  });

  it('[B3] unit mi reads the same number as miles: 300 mi reaches Spiti Valley, which 300 km does not', async () => {
    await createWholeCatalogue();

    const kilometres = (await within('300', DELHI, 'km')).body as WithinBody;
    const miles = (await within('300', DELHI, 'mi')).body as WithinBody;
    const milesNames = miles.data.tours.map((tour) => tour.name);

    expect(kilometres.data.tours.map((tour) => tour.name)).not.toContain(
      'Spiti Valley Star Gazer',
    );
    expect(milesNames).toContain('Spiti Valley Star Gazer');
    expect(milesNames.length).toBeGreaterThan(
      kilometres.data.tours.length,
    );
  });

  it('[B3] a radius that contains no start location answers 200 with tours []', async () => {
    await createWholeCatalogue();

    const response = await within('1', '0,80', 'km');

    expect(response.status).toBe(200);
    expect((response.body as WithinBody).data.tours).toEqual([]);
  });

  it('[B3] latitude 90 and -90 and longitude 180 and -180 are accepted, as are a 20000 km radius', async () => {
    await createWholeCatalogue();

    for (const latlng of ['90,180', '-90,-180', '90,-180', '-90,180']) {
      expect((await within('300', latlng, 'km')).status, latlng).toBe(200);
    }
    expect((await within('20000', DELHI, 'km')).status).toBe(200);
  });

  it('[B3] 90.0001, 180.0001, 95,77 and 28,200 are each a 400 and MongoDB is not queried', async () => {
    const find = vi.spyOn(Tour, 'find');
    const aggregate = vi.spyOn(Tour, 'aggregate');

    for (const latlng of ['90.0001,77', '28,180.0001', '95,77', '28,200']) {
      const response = await within('300', latlng, 'km');

      expect(response.status, latlng).toBe(400);
      expect((response.body as ErrorBody).error.code, latlng).toBe(
        'VALIDATION_ERROR',
      );
    }
    expect(find).not.toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('[B3] a distance of 0, -5, abc, 20001 or a unit of ft is each a 400 and MongoDB is not queried', async () => {
    const find = vi.spyOn(Tour, 'find');
    const aggregate = vi.spyOn(Tour, 'aggregate');

    const cases: Array<[string, string, string]> = [
      ['0', DELHI, 'km'],
      ['-5', DELHI, 'km'],
      ['abc', DELHI, 'km'],
      ['20001', DELHI, 'km'],
      ['300', DELHI, 'ft'],
    ];
    for (const [distance, latlng, unit] of cases) {
      const response = await within(distance, latlng, unit);

      expect(response.status, `${distance} ${unit}`).toBe(400);
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    }
    expect(find).not.toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('[B3] two parallel calls return identical bodies', async () => {
    await createWholeCatalogue();

    const [first, second] = await Promise.all([
      within('300', DELHI, 'km'),
      within('300', DELHI, 'km'),
    ]);

    expect(second.body).toEqual(first.body);
  });
});

describe('GET /api/v1/tours/distances/[latlng]/unit/[unit]', () => {
  it('[B3] lists all 13 tours with their distance from Delhi, nearest first, Golden Triangle Heritage at about 4.7 km', async () => {
    await createWholeCatalogue();

    const response = await distances(DELHI, 'km');
    const body = response.body as DistancesBody;

    expect(response.status).toBe(200);
    expect(body.data.distances).toHaveLength(13);
    expect(body.data.distances[0]?.name).toBe('Golden Triangle Heritage');
    expect(body.data.distances[0]?.distance).toBeCloseTo(4.7, 1);
    const values = body.data.distances.map((entry) => entry.distance);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('[B3] each entry is exactly { id, name, slug, distance }, rounded to 2 decimals', async () => {
    await createWholeCatalogue();

    const body = (await distances(DELHI, 'km')).body as DistancesBody;

    for (const entry of body.data.distances) {
      expect(Object.keys(entry).sort()).toEqual([
        'distance',
        'id',
        'name',
        'slug',
      ]);
      expect(Math.round(entry.distance * 100) / 100).toBe(entry.distance);
    }
  });

  it('[B3] unit mi gives the distances in miles', async () => {
    await createWholeCatalogue();

    const km = (await distances(DELHI, 'km')).body as DistancesBody;
    const mi = (await distances(DELHI, 'mi')).body as DistancesBody;

    expect(mi.data.distances[0]?.distance).toBeCloseTo(
      (km.data.distances[0]?.distance ?? 0) * 0.621371,
      1,
    );
  });

  it('[B3] latitude 90 and longitude -180 are accepted', async () => {
    await createWholeCatalogue();

    expect((await distances('90,-180', 'km')).status).toBe(200);
    expect((await distances('-90,180', 'km')).status).toBe(200);
  });

  it('[B3] 90.0001, 0,180.0001, abc,77 and a unit of ft are each a 400 and MongoDB is not queried', async () => {
    const find = vi.spyOn(Tour, 'find');
    const aggregate = vi.spyOn(Tour, 'aggregate');

    const cases: Array<[string, string]> = [
      ['90.0001,0', 'km'],
      ['0,180.0001', 'km'],
      ['abc,77', 'km'],
      ['28.6139', 'km'],
      [DELHI, 'ft'],
    ];
    for (const [latlng, unit] of cases) {
      const response = await distances(latlng, unit);

      expect(response.status, `${latlng} ${unit}`).toBe(400);
      expect((response.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    }
    expect(find).not.toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('[B3] two parallel calls return identical bodies', async () => {
    await createWholeCatalogue();

    const [first, second] = await Promise.all([
      distances(DELHI, 'km'),
      distances(DELHI, 'km'),
    ]);

    expect(second.body).toEqual(first.body);
  });
});
