// The tour images endpoint (S16, B4, U27, D-13, D-14). Uploads are real seed photos with their real
// credits, so every stored photo in these tests has the credit the site would show for it.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import * as route from '@/app/api/v1/tours/[id]/images/route';
import { Tour } from '@/server/modules/tours/model';
import { callRoute } from '../../helpers/call-route';
import { useTestDatabase } from '../../helpers/db';
import { createTour, createUser } from '../../helpers/factories';
import { fakes } from '../../helpers/fakes';
import { pixelBombPng, smallJpeg } from '../../helpers/images';
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

describe('PUT /api/v1/tours/[id]/images (one database for the file)', () => {
  // One database for the file: every block below shares it (see useTestDatabase).
  useTestDatabase();

  describe('the cover (S16, B4, U27)', () => {
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

  type ErrorBody = {
    status: string;
    error: {
      code: string;
      message: string;
      details?: Array<{ path: string; message: string }>;
    };
  };

  /** A cover and its credit, as one upload form. */
  function coverForm(bytes: Uint8Array, file: string, type = 'image/jpeg') {
    const form = new FormData();
    form.append('imageCover', new File([bytes], file, { type }));
    form.append('credits', JSON.stringify({ imageCover: creditFor(file) }));
    return form;
  }

  /** The gallery files named by `files`, each with its credit, in the order given. */
  async function galleryForm(files: string[]) {
    const form = new FormData();
    for (const file of files) {
      form.append('images', photo(file));
    }
    form.append(
      'credits',
      JSON.stringify({ images: files.map((file) => creditFor(file)) }),
    );
    return form;
  }

  describe('PUT /api/v1/tours/[id]/images: limits and rejections (S16, SEC-05)', () => {
    afterEach(() => {
      fakes.storage.files.clear();
    });

    it('[S16] a text file sent as image/jpeg is 415, and nothing is stored', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const note = new TextEncoder().encode('This is a note, not a photo.');

      const response = await putImages(
        seedIdOf(KEDARKANTHA),
        coverForm(note, 'valley-of-flowers-trek-cover.jpg'),
        admin,
      );

      expect(response.status).toBe(415);
      expect((response.body as ErrorBody).error.code).toBe(
        'UNSUPPORTED_MEDIA_TYPE',
      );
      expect(fakes.storage.files.size).toBe(0);
    });

    it('[S16] an SVG sent as image/jpeg is 415', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const svg = new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );

      const response = await putImages(
        seedIdOf(KEDARKANTHA),
        coverForm(svg, 'valley-of-flowers-trek-cover.jpg'),
        admin,
      );

      expect(response.status).toBe(415);
    });

    it('[S16] a JSON body sent to the images route is 415', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });

      const response = await callRoute(route, {
        method: 'PUT',
        path: `/api/v1/tours/${seedIdOf(KEDARKANTHA)}/images`,
        params: { id: seedIdOf(KEDARKANTHA) },
        body: { imageCover: 'tours/x.jpg' },
        as: admin,
      });

      expect(response.status).toBe(415);
      expect((response.body as ErrorBody).error.code).toBe(
        'UNSUPPORTED_MEDIA_TYPE',
      );
    });

    it('[S16] a file of 5 MB plus one byte is 413', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const oversize = new Uint8Array(5 * 1024 * 1024 + 1);
      oversize.set([0xff, 0xd8, 0xff]);

      const response = await putImages(
        seedIdOf(KEDARKANTHA),
        coverForm(oversize, 'valley-of-flowers-trek-cover.jpg'),
        admin,
      );

      expect(response.status).toBe(413);
      expect((response.body as ErrorBody).error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('[S16] a PNG declaring 16,000 by 16,000 pixels is 413 (the pixel bomb)', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const bomb = await pixelBombPng();

      const response = await putImages(
        seedIdOf(KEDARKANTHA),
        coverForm(bomb, 'valley-of-flowers-trek-cover.jpg', 'image/png'),
        admin,
      );

      expect(response.status).toBe(413);
    });

    it('[S16] a request with no file is 400 and says which photo to choose', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const form = new FormData();
      form.append('credits', '{}');

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      const body = response.body as ErrorBody;
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details?.[0]?.message).toBe(
        'Choose a photo to upload.',
      );
    });

    it('[S16] two cover files in one request are 400', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const file = 'valley-of-flowers-trek-cover.jpg';
      const form = new FormData();
      form.append('imageCover', photo(file));
      form.append('imageCover', photo(file));
      form.append('credits', JSON.stringify({ imageCover: creditFor(file) }));

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.details?.[0]?.message).toBe(
        'Upload one cover photo at a time.',
      );
    });

    it('[S16] a cover with no credit is 400, and the details name the credit', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const form = new FormData();
      form.append('imageCover', photo('valley-of-flowers-trek-cover.jpg'));
      form.append('credits', '{}');

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.details?.[0]?.path).toBe(
        'credits.imageCover',
      );
    });

    it('[S16] an extra credit with no cover file is 400', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const form = new FormData();
      form.append('images', photo('valley-of-flowers-trek-1.jpg'));
      form.append(
        'credits',
        JSON.stringify({
          imageCover: creditFor('valley-of-flowers-trek-cover.jpg'),
          images: [creditFor('valley-of-flowers-trek-1.jpg')],
        }),
      );

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.details?.[0]?.path).toBe(
        'credits.imageCover',
      );
    });

    it('[S16] credits that are not valid JSON are 400', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const form = new FormData();
      form.append('imageCover', photo('valley-of-flowers-trek-cover.jpg'));
      form.append('credits', '{"imageCover": ');

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.details?.[0]?.message).toBe(
        'The credits are not valid JSON. Check the credits and try again.',
      );
    });

    it('[S16] four gallery images are 400, and none is stored', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const form = await galleryForm([
        'valley-of-flowers-trek-1.jpg',
        'valley-of-flowers-trek-2.jpg',
        'valley-of-flowers-trek-3.jpg',
        'valley-of-flowers-trek-cover.jpg',
      ]);

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      expect((response.body as ErrorBody).error.details?.[0]?.message).toBe(
        'A tour can have up to three gallery photos.',
      );
      expect(fakes.storage.files.size).toBe(0);
    });

    it('[S16] an unknown part is 400 and names the part', async () => {
      await createTour({ slug: KEDARKANTHA });
      const { user: admin } = await createUser({ role: 'admin' });
      const form = coverForm(
        await smallJpeg(),
        'valley-of-flowers-trek-cover.jpg',
      );
      form.append('caption', 'Sunrise over the lake');

      const response = await putImages(seedIdOf(KEDARKANTHA), form, admin);

      expect(response.status).toBe(400);
      const detail = (response.body as ErrorBody).error.details?.[0];
      expect(detail?.path).toBe('caption');
      expect(detail?.message).toBe(
        "This field isn't recognised. Remove it and try again.",
      );
      expect(fakes.storage.files.size).toBe(0);
    });

    it('[S16] an anonymous PUT is refused with 401 before its body is read', async () => {
      const tourId = seedIdOf(KEDARKANTHA);
      let pulled = 0;
      const body = new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            pulled += 1;
            controller.enqueue(new Uint8Array(1024));
            controller.close();
          },
        },
        { highWaterMark: 0 },
      );
      const request = new NextRequest(
        `http://localhost:3000/api/v1/tours/${tourId}/images`,
        {
          method: 'PUT',
          headers: {
            origin: 'http://localhost:3000',
            'content-type': 'multipart/form-data; boundary=b',
          },
          body,
          duplex: 'half',
        } as RequestInit,
      );

      const response = await route.PUT(request, {
        params: Promise.resolve({ id: tourId }),
      });

      expect(response.status).toBe(401);
      expect(pulled).toBe(0);
    });

    it('[S16] a 30 MB anonymous PUT is 401, not 413, because access is checked before the body is read', async () => {
      const huge = new Uint8Array(30 * 1024 * 1024);
      const form = new FormData();
      form.append(
        'imageCover',
        new File([huge], 'huge.jpg', { type: 'image/jpeg' }),
      );

      const response = await putImages(seedIdOf(KEDARKANTHA), form);

      expect(response.status).toBe(401);
      expect((response.body as ErrorBody).error.code).toBe('UNAUTHENTICATED');
    });

    it('[S16][SEC-05] the 21st upload by one user within the hour is 429 with a retry-after', async () => {
      await createTour({ slug: KEDARKANTHA });
      const tourId = seedIdOf(KEDARKANTHA);
      const { user: admin } = await createUser({ role: 'admin' });
      const bytes = await smallJpeg();
      const file = 'valley-of-flowers-trek-cover.jpg';

      for (let attempt = 1; attempt <= 20; attempt += 1) {
        const accepted = await putImages(tourId, coverForm(bytes, file), admin);
        expect(accepted.status, `upload ${attempt}`).toBe(200);
      }
      const refused = await putImages(tourId, coverForm(bytes, file), admin);

      expect(refused.status).toBe(429);
      expect((refused.body as ErrorBody).error.code).toBe('RATE_LIMITED');
      expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0);
    });

    it('[SEC-05] the limit is per signed-in user, so another admin is not held back', async () => {
      await createTour({ slug: KEDARKANTHA });
      const tourId = seedIdOf(KEDARKANTHA);
      const { user: first } = await createUser({ role: 'admin' });
      const { user: second } = await createUser({ role: 'lead-guide' });
      const bytes = await smallJpeg();
      const file = 'valley-of-flowers-trek-cover.jpg';
      for (let attempt = 1; attempt <= 20; attempt += 1) {
        await putImages(tourId, coverForm(bytes, file), first);
      }

      const other = await putImages(tourId, coverForm(bytes, file), second);

      expect(other.status).toBe(200);
    });
  });
});
