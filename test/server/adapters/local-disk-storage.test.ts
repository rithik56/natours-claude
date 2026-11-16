import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalDiskStorage } from '@/server/adapters/local-disk-storage';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'natours-storage-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('local disk storage', () => {
  it('[D2] put, get and delete round-trip a photo under the root directory', async () => {
    const storage = createLocalDiskStorage(root);
    const body = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

    await storage.put('tours/a.jpg', body, 'image/jpeg');
    const stored = await storage.get('tours/a.jpg');
    expect(stored?.contentType).toBe('image/jpeg');
    expect([...(stored?.body ?? [])]).toEqual([...body]);

    await storage.delete('tours/a.jpg');
    expect(await storage.get('tours/a.jpg')).toBeNull();
  });

  it('[D2] get returns null for a well-formed key that is not stored', async () => {
    const storage = createLocalDiskStorage(root);
    expect(await storage.get('tours/never-uploaded.jpg')).toBeNull();
  });

  it('[D2] delete ignores a file that is not there', async () => {
    const storage = createLocalDiskStorage(root);
    await expect(storage.delete('tours/missing.jpg')).resolves.toBeUndefined();
  });

  it('[D2] takes the content type from the extension map: png, webp and jpeg', async () => {
    const storage = createLocalDiskStorage(root);
    await storage.put('a.png', Buffer.from('p'), 'image/png');
    await storage.put('b.webp', Buffer.from('w'), 'image/webp');
    await storage.put('c.jpeg', Buffer.from('j'), 'image/jpeg');

    expect((await storage.get('a.png'))?.contentType).toBe('image/png');
    expect((await storage.get('b.webp'))?.contentType).toBe('image/webp');
    expect((await storage.get('c.jpeg'))?.contentType).toBe('image/jpeg');
  });

  it('[D2] put refuses an extension that is not in the map and stores nothing', async () => {
    const storage = createLocalDiskStorage(root);
    await expect(
      storage.put('tours/a.gif', Buffer.from('g'), 'image/gif'),
    ).rejects.toThrow(/extension/);
    expect(await storage.get('tours/a.gif')).toBeNull();
  });

  it('[D2] put refuses a content type that disagrees with the extension', async () => {
    const storage = createLocalDiskStorage(root);
    await expect(
      storage.put('tours/a.jpg', Buffer.from('j'), 'image/png'),
    ).rejects.toThrow(/content type/);
  });

  it.each([
    ['a dot-dot segment', '..'],
    ['a dot-dot in the middle', 'tours/../a.jpg'],
    ['a leading slash', '/etc/passwd'],
    ['an empty segment', 'tours//a.jpg'],
    ['a backslash', 'tours\\a.jpg'],
    ['an uppercase segment', 'Tours/a.jpg'],
    ['a space in a segment', 'tours/a b.jpg'],
    ['more than four segments', 'a/b/c/d/e.jpg'],
    ['an empty key', ''],
  ])('[D2] refuses a key with %s, for every operation', async (_, key) => {
    const storage = createLocalDiskStorage(root);
    await expect(storage.put(key, Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
      Error,
    );
    await expect(storage.get(key)).rejects.toThrow(Error);
    await expect(storage.delete(key)).rejects.toThrow(Error);
  });

  it('[D2] urlFor gives the root-relative /media path for the key', () => {
    const storage = createLocalDiskStorage(root);
    expect(storage.urlFor('tours/a.jpg')).toBe('/media/tours/a.jpg');
  });
});
