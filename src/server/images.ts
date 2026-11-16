import 'server-only';
import sharp from 'sharp';
import { AppError } from '@/server/errors';

/** Each uploaded file is at most 5 MB (S16, SEC-17). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** The pixel limit that stops a decompression bomb (T-04-37, SEC-17). */
const MAX_INPUT_PIXELS = 40_000_000;

/** The widest a stored photo is kept, by what it is used for (S16). */
const PRESET_WIDTH = { tour: 2000, user: 512 } as const;

export type ImagePreset = keyof typeof PRESET_WIDTH;

let concurrencySet = false;

function startsWith(bytes: Uint8Array, signature: number[], at = 0): boolean {
  return signature.every((byte, index) => bytes[at + index] === byte);
}

// Magic bytes decide the type. The declared Content-Type of the part is never consulted (S16).
function isJpeg(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0xff, 0xd8, 0xff]);
}

function isPng(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

// RIFF, four length bytes, then WEBP.
function isWebp(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  );
}

/**
 * Checks one uploaded photo and re-encodes it as WebP (S16, SEC-17, T-04-37, T-04-38). The
 * file is refused before sharp sees it when it is over 5 MB or is not JPEG, PNG or WebP by its
 * bytes. sharp then rotates it by its EXIF orientation, strips its metadata, caps its width and
 * refuses an image over 40,000,000 input pixels.
 *
 * @param bytes - The file as uploaded.
 * @param preset - `tour` keeps up to 2000 px wide; `user` keeps up to 512 px.
 * @returns The WebP bytes.
 * @throws AppError PAYLOAD_TOO_LARGE when the file is over 5 MB or over the pixel limit.
 * @throws AppError UNSUPPORTED_MEDIA_TYPE when the bytes are not JPEG, PNG or WebP, or sharp cannot decode them.
 */
export async function normalize(
  bytes: Uint8Array,
  preset: ImagePreset,
): Promise<Buffer> {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new AppError('PAYLOAD_TOO_LARGE');
  }
  if (!isJpeg(bytes) && !isPng(bytes) && !isWebp(bytes)) {
    throw new AppError('UNSUPPORTED_MEDIA_TYPE');
  }
  if (!concurrencySet) {
    sharp.concurrency(1);
    concurrencySet = true;
  }
  try {
    return await sharp(bytes, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: 'error',
      pages: 1,
    })
      .rotate()
      .resize({ width: PRESET_WIDTH[preset], withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const code = /pixel limit/i.test(message)
      ? 'PAYLOAD_TOO_LARGE'
      : 'UNSUPPORTED_MEDIA_TYPE';
    const refused = new AppError(code);
    refused.cause = error;
    throw refused;
  }
}

/**
 * A storage key that no client can choose: `<prefix>/<uuid>.webp` (T-04-40). The prefix is
 * server-side too, so a file name from the upload never reaches storage.
 */
export function randomImageKey(prefix: string): string {
  return `${prefix}/${crypto.randomUUID()}.webp`;
}
