// Photo checks and re-encoding for tour uploads (S16, SEC-17). The seed photos are real files; the
// oversize, wrong-type and bomb cases are built from bytes in the test, never from invented pictures.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { normalize, randomImageKey } from '@/server/images';
import { pixelBombPng } from '../helpers/images';

const SEED_PHOTOS = path.resolve(import.meta.dirname, '../../seed/img/tours');

function seedPhoto(file: string): Uint8Array {
  return readFileSync(path.join(SEED_PHOTOS, file));
}

async function dimensionsOf(bytes: Buffer) {
  const meta = await sharp(bytes).metadata();
  return { format: meta.format, width: meta.width ?? 0 };
}

describe('normalize (S16)', () => {
  it('[S16] a seed JPEG comes back as WebP, no wider than 2000 px', async () => {
    const webp = await normalize(
      seedPhoto('valley-of-flowers-trek-cover.jpg'),
      'tour',
    );

    const { format, width } = await dimensionsOf(webp);
    expect(format).toBe('webp');
    expect(width).toBeLessThanOrEqual(2000);
  });

  it('[S16] a photo wider than 2000 px is scaled down to 2000 px wide', async () => {
    const wide = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: '#3a6b4f',
      },
    })
      .jpeg()
      .toBuffer();

    const webp = await normalize(wide, 'tour');

    expect((await dimensionsOf(webp)).width).toBe(2000);
  });

  it('[S16] a PNG made by sharp passes and comes back as WebP', async () => {
    const png = await sharp({
      create: { width: 320, height: 200, channels: 3, background: '#c25b2a' },
    })
      .png()
      .toBuffer();

    const webp = await normalize(png, 'tour');

    expect((await dimensionsOf(webp)).format).toBe('webp');
  });

  it('[S16] text bytes are refused with UNSUPPORTED_MEDIA_TYPE, whatever the caller says the type is', async () => {
    const text = new TextEncoder().encode('This is a note, not a photo.');

    await expect(normalize(text, 'tour')).rejects.toMatchObject({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      status: 415,
    });
  });

  it('[S16] an SVG is refused with UNSUPPORTED_MEDIA_TYPE', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    await expect(normalize(svg, 'tour')).rejects.toMatchObject({
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  });

  it('[S16] a JPEG header followed by garbage is refused with UNSUPPORTED_MEDIA_TYPE', async () => {
    const fake = new Uint8Array(4096);
    fake.set([0xff, 0xd8, 0xff, 0xe0]);
    for (let index = 4; index < fake.length; index += 1) {
      fake[index] = (index * 37) % 251;
    }

    await expect(normalize(fake, 'tour')).rejects.toMatchObject({
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  });

  it('[S16] a PNG declaring 16,000 by 16,000 pixels is refused with PAYLOAD_TOO_LARGE before it is decoded', async () => {
    const bomb = await pixelBombPng();

    await expect(normalize(bomb, 'tour')).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    });
  });

  it('[S16] a file of 5 MB plus one byte is refused with PAYLOAD_TOO_LARGE', async () => {
    const oversize = new Uint8Array(5 * 1024 * 1024 + 1);
    oversize.set([0xff, 0xd8, 0xff]);

    await expect(normalize(oversize, 'tour')).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      status: 413,
    });
  });
});

describe('randomImageKey (T-04-40)', () => {
  it('[S16] returns the prefix, a UUID and .webp, and a new key every time', () => {
    const first = randomImageKey('tours');
    const second = randomImageKey('tours');

    expect(first).toMatch(
      /^tours\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/,
    );
    expect(second).not.toBe(first);
  });
});
