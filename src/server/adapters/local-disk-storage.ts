import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mediaUrlFor, type Storage } from './storage';

// ADR 0029: development and ci keep uploads on disk under STORAGE_DIR, so the seed process
// and the web server share them. A key is one to four plain segments, and resolveKey confines
// every path to the storage directory before any filesystem call.
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;
const MAX_SEGMENTS = 4;

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function contentTypeOf(key: string): string | undefined {
  const dot = key.lastIndexOf('.');
  if (dot === -1) return undefined;
  const extension = key.slice(dot + 1);
  return Object.hasOwn(CONTENT_TYPES, extension)
    ? CONTENT_TYPES[extension]
    : undefined;
}

// The messages name the rule that failed and never echo the key, so a refused path stays out of logs.
function resolveKey(root: string, key: string): string {
  if (key.includes('\\')) {
    throw new Error('A storage key must not contain a backslash');
  }
  const segments = key.split('/');
  if (segments.length > MAX_SEGMENTS) {
    throw new Error(`A storage key has at most ${MAX_SEGMENTS} segments`);
  }
  for (const segment of segments) {
    if (segment === '') {
      throw new Error('A storage key must not have an empty segment');
    }
    if (segment === '..') {
      throw new Error('A storage key must not contain ".."');
    }
    if (!SEGMENT.test(segment)) {
      throw new Error('A storage segment must match ^[a-z0-9][a-z0-9._-]*$');
    }
  }
  const file = path.resolve(root, ...segments);
  if (!file.startsWith(root + path.sep)) {
    throw new Error('A storage key must stay inside the storage directory');
  }
  return file;
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}

/** Stores files under `rootDir` (STORAGE_DIR), for development and ci only (ADR 0029). */
export function createLocalDiskStorage(rootDir: string): Storage {
  const root = path.resolve(rootDir);
  return {
    async put(key, body, contentType) {
      const file = resolveKey(root, key);
      const expected = contentTypeOf(key);
      if (expected === undefined) {
        throw new Error(
          'A stored file must have a .jpg, .jpeg, .png or .webp extension',
        );
      }
      if (expected !== contentType) {
        throw new Error('The content type must match the file extension');
      }
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- resolveKey confined the path under the root
      await mkdir(path.dirname(file), { recursive: true });
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- resolveKey confined the path under the root
      await writeFile(file, body);
    },
    async get(key) {
      const file = resolveKey(root, key);
      const contentType = contentTypeOf(key);
      // Nothing with another extension can be stored, so it cannot be there.
      if (contentType === undefined) return null;
      try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- resolveKey confined the path under the root
        const body = await readFile(file);
        return { body, contentType };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async delete(key) {
      const file = resolveKey(root, key);
      await rm(file, { force: true });
    },
    urlFor: mediaUrlFor,
  };
}
