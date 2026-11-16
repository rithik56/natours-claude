// The tour images endpoint (S16, B4, U27, D-13, D-14). Uploads are real seed photos with their real
// credits, so every stored photo in these tests has the credit the site would show for it.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/[id]/images/route';
import { Tour } from '@/server/modules/tours/model';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour, createUser } from '../../helpers/factories';
import { fakes } from '../../helpers/fakes';
import { seedTours } from '../../helpers/seed';

const SEED = path.resolve(import.meta.dirname, '../../../seed');
const KEDARKANTHA = 'kedarkantha-winter-trek';
const VALLEY = 'valley-of-flowers-trek';
const NEW_KEY = /^tours\/[0-9a-f-]{36}\.webp$/;

type SeedCredit = {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  alt?: string;
};

type SeedTourRecord = {
  slug: string;
  name: string;
  _id: string;
  photoCredits: SeedCredit[];
};

const seedRecords = JSON.parse(
  readFileSync(path.join(SEED, 'data/tours.json'), 'utf8'),
) as SeedTourRecord[];

/** The seed's credit for one photo, without its file key, as an upload sends it. */
function creditFor(file: string) {
  const record = seedRecords
    .flatMap((tour) => tour.photoCredits)
    .find((credit) => credit.file === file);
  if (!record) throw new Error(`no seed credit for ${file}`);
  return {
    title: record.title,
    author: record.author,
    license: record.license,
    licenseUrl: record.licenseUrl,
    sourceUrl: record.sourceUrl,
    ...(record.alt === undefined ? {} : { alt: record.alt }),
  };
}

function photo(file: string): File {
  return new File([readFileSync(path.join(SEED, 'img/tours', file))], file, {
    type: 'image/jpeg',
  });
}

function seedIdOf(slug: string): string {
  return seedTours().find((tour) => tour.slug === slug)!._id;
}

type AdminUser = { _id: unknown };

async function putImages(id: string, form: FormData, as?: AdminUser) {
  return callRoute(route, {
    method: 'PUT',
    path: `/api/v1/tours/${id}/images`,
    params: { id },
    body: form,
    as,
  });
}

describe('PUT /api/v1/tours/[id]/images: the cover (S16, B4, U27)', () => {
  useTestDatabase();

  afterEach(() => {
    fakes.storage.files.clear();
  });

  it('[S16][B4][U27] an admin uploads a seed photo as the cover, re-encoded and credited under a new key', async () => {
    await createTour({ slug: KEDARKANTHA });
    const tourId = seedIdOf(KEDARKANTHA);
    const { user: admin } = await createUser({ role: 'admin' });
    const oldCover = `tours/kedarkantha-winter-trek-cover.jpg`;
    await fakes.storage.put(oldCover, Buffer.from('old cover'), 'image/jpeg');
    const file = 'valley-of-flowers-trek-2.jpg';
    const form = new FormData();
    form.append('imageCover', photo(file));
    form.append('credits', JSON.stringify({ imageCover: creditFor(file) }));

    const response = await putImages(tourId, form, admin);

    expect(response.status).toBe(200);
    const stored = [...fakes.storage.files.entries()].filter(([key]) =>
      NEW_KEY.test(key),
    );
    expect(stored).toHaveLength(1);
    const [newKey, object] = stored[0]!;
    expect(object.contentType).toBe('image/webp');
    expect(fakes.storage.files.has(oldCover)).toBe(false);

    const saved = await Tour.findById(tourId).lean();
    expect(saved?.imageCover).toBe(newKey);
    const creditsForNew = (saved?.photoCredits ?? []).filter(
      (credit) => credit.file === newKey,
    );
    expect(creditsForNew).toHaveLength(1);
    expect(creditsForNew[0]?.author).toBe(creditFor(file).author);
    expect(
      (saved?.photoCredits ?? []).some((credit) => credit.file === oldCover),
    ).toBe(false);
    expect(fakes.cache.invalidated).toEqual(
      expect.arrayContaining(['tours', `tour:${tourId}`]),
    );
  });

  it('[D-13] a cover uploaded to a tour with no cover puts the tour into the public catalogue', async () => {
    await createTour({ slug: VALLEY, withoutCover: true });
    const tourId = seedIdOf(VALLEY);
    const { user: admin } = await createUser({ role: 'admin' });
    const file = 'valley-of-flowers-trek-cover.jpg';
    const form = new FormData();
    form.append('imageCover', photo(file));
    form.append('credits', JSON.stringify({ imageCover: creditFor(file) }));

    const response = await putImages(tourId, form, admin);

    expect(response.status).toBe(200);
    const saved = await Tour.findById(tourId).lean();
    expect(saved?.imageCover).toMatch(NEW_KEY);
  });
});
