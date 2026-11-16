// Image bytes for the upload tests. Each is built in the test run, so no invented picture is committed.
import { crc32 } from 'node:zlib';
import sharp from 'sharp';

/** A small JPEG, for tests that upload many photos and need each one to be quick. */
export async function smallJpeg(
  width = 64,
  height = 48,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(
    await sharp({
      create: { width, height, channels: 3, background: '#2f6b4f' },
    })
      .jpeg()
      .toBuffer(),
  );
}

/**
 * A PNG whose header declares 16,000 by 16,000 pixels (T-04-37). It is an 8 by 8 PNG with its IHDR
 * width and height rewritten, and the IHDR CRC recomputed over the chunk type and data (bytes 12 to 28),
 * so the declared size is the only thing wrong with it.
 */
export async function pixelBombPng(): Promise<Uint8Array<ArrayBuffer>> {
  const small = await sharp({
    create: { width: 8, height: 8, channels: 3, background: '#000000' },
  })
    .png()
    .toBuffer();
  const png = Buffer.from(small);
  png.writeUInt32BE(16000, 16);
  png.writeUInt32BE(16000, 20);
  png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);
  return new Uint8Array(png);
}
