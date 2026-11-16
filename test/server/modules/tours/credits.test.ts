import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeps } from '@/server/deps';
import { Tour } from '@/server/modules/tours/model';
import { listCredits } from '@/server/modules/tours/service';
import { useTestDatabase } from '../../../helpers/db';
import { createTour } from '../../../helpers/factories';
import { seedTours } from '../../../helpers/seed';

// seed/data/tours.json carries each tour's credits, but the seed helper's type leaves them out.
type SeedCredit = { file: string; title: string };
type SeedTourCredits = {
  name: string;
  imageCover: string;
  images: string[];
  photoCredits: SeedCredit[];
};

type StoredTour = {
  name: string;
  imageCover: string;
  images: string[];
  photoCredits: Array<{ file: string }>;
};

/** The keys a tour's photos have in the database: the storage prefix `tours/` (QA-03). */
function storedKeysOf(tour: {
  imageCover: string;
  images: string[];
}): string[] {
  return [tour.imageCover, ...tour.images].map((file) => `tours/${file}`);
}

function seedTourCredits(): SeedTourCredits[] {
  return seedTours() as unknown as SeedTourCredits[];
}

async function createWholeCatalogue(): Promise<void> {
  for (let index = 0; index < seedTours().length; index += 1) {
    await createTour();
  }
}

// One database for the whole file: useTestDatabase is called once per file (test/helpers/db.ts).
describe('photo credits (U27)', () => {
  useTestDatabase();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[U27] lists 13 tour groups and 52 photos when the whole catalogue is loaded', async () => {
    await createWholeCatalogue();

    const groups = await listCredits();

    expect(groups).toHaveLength(13);
    expect(
      groups.reduce((total, group) => total + group.photos.length, 0),
    ).toBe(52);
  });

  it('[U27] each group carries the tour name and slug, and each photo its title, author, licence and source', async () => {
    await createTour({ slug: 'ladakh-high-passes' });

    const [group] = await listCredits();

    expect(group).toMatchObject({
      name: 'Ladakh High Passes',
      slug: 'ladakh-high-passes',
    });
    expect(group!.photos[0]).toEqual({
      key: expect.stringMatching(/^tours\/.+\.jpg$/),
      title: expect.any(String),
      sourceUrl: expect.stringMatching(/^https:\/\/commons\.wikimedia\.org\//),
      author: expect.any(String),
      license: expect.any(String),
      licenseUrl: expect.stringMatching(/^https:\/\/creativecommons\.org\//),
    });
  });

  it('[U27] within a group the cover comes first, then the gallery in images order', async () => {
    await createWholeCatalogue();

    const groups = await listCredits();

    for (const group of groups) {
      const record = seedTourCredits().find(
        (tour) => tour.name === group.name,
      )!;
      expect(
        group.photos.map((photo) => photo.key),
        group.name,
      ).toEqual(storedKeysOf(record));
    }
  });

  it('[U27] groups follow createdAt ascending, so the earlier tour comes first', async () => {
    const later = await createTour({ slug: 'ladakh-high-passes' });
    const earlier = await createTour({ slug: 'valley-of-flowers-trek' });
    // The factory stamps createdAt as it runs, so the test sets the instants itself.
    await Tour.collection.updateOne(
      { _id: later._id },
      { $set: { createdAt: new Date('2026-01-02T00:00:00Z') } },
    );
    await Tour.collection.updateOne(
      { _id: earlier._id },
      { $set: { createdAt: new Date('2026-01-01T00:00:00Z') } },
    );

    const groups = await listCredits();

    expect(groups.map((group) => group.slug)).toEqual([
      'valley-of-flowers-trek',
      'ladakh-high-passes',
    ]);
  });

  it('[U27] tours with the same createdAt are ordered by id', async () => {
    const first = await createTour({ slug: 'ladakh-high-passes' });
    const second = await createTour({ slug: 'valley-of-flowers-trek' });
    await Tour.collection.updateMany(
      { _id: { $in: [first._id, second._id] } },
      { $set: { createdAt: new Date('2026-01-01T00:00:00Z') } },
    );
    const slugById = new Map([
      [String(first._id), 'ladakh-high-passes'],
      [String(second._id), 'valley-of-flowers-trek'],
    ]);
    const expected = [String(first._id), String(second._id)]
      .sort()
      .map((id) => slugById.get(id));

    const groups = await listCredits();

    expect(groups.map((group) => group.slug)).toEqual(expected);
  });

  it('[U27] every catalogue photo has exactly one credit in the seed files, and no credit names another photo', () => {
    for (const tour of seedTourCredits()) {
      const photos = [tour.imageCover, ...tour.images];
      for (const file of photos) {
        expect(
          tour.photoCredits.filter((credit) => credit.file === file).length,
          `${tour.name}: ${file}`,
        ).toBe(1);
      }
      const extra = tour.photoCredits
        .map((credit) => credit.file)
        .filter((file) => !photos.includes(file));
      expect(extra, tour.name).toEqual([]);
    }
  });

  it('[U27] every catalogue photo has exactly one stored credit, and the page lists each one', async () => {
    await createWholeCatalogue();
    const records = await Tour.find().lean<StoredTour[]>();
    const groups = await listCredits();

    // Stored keys already carry the tours/ prefix, so they compare as they are.
    for (const record of records) {
      const photos = [record.imageCover, ...record.images];
      for (const file of photos) {
        expect(
          record.photoCredits.filter((credit) => credit.file === file).length,
          `${record.name}: ${file}`,
        ).toBe(1);
      }
      const extra = record.photoCredits
        .map((credit) => credit.file)
        .filter((file) => !photos.includes(file));
      expect(extra, record.name).toEqual([]);
      const group = groups.find((entry) => entry.name === record.name);
      expect(
        group?.photos.map((photo) => photo.key),
        record.name,
      ).toEqual(photos);
    }
    expect(groups).toHaveLength(records.length);
  });

  it('[U27] a tour with no credits renders no group', async () => {
    await createWholeCatalogue();
    await Tour.collection.updateOne(
      { slug: 'ladakh-high-passes' },
      { $set: { photoCredits: [] } },
    );

    const groups = await listCredits();

    expect(groups).toHaveLength(12);
    expect(groups.map((group) => group.slug)).not.toContain(
      'ladakh-high-passes',
    );
  });

  it('[U27] an empty catalogue lists no groups', async () => {
    expect(await listCredits()).toEqual([]);
  });

  it('[U27] reads the list through the cache under ["credits"] with the tours tag', async () => {
    const cached = vi.spyOn(getDeps().cache, 'cached');

    await listCredits();

    expect(cached).toHaveBeenCalledWith(
      expect.any(Function),
      ['credits'],
      ['tours'],
    );
  });
});
