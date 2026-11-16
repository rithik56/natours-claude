import 'server-only';

/** Keeps uploaded files. Every adapter serves them from `/media/<key>` (ADR 0029). */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

export type StoredFile = { body: Buffer; contentType: string };

export type FakeStorage = Storage & {
  files: Map<string, StoredFile>;
  reset(): void;
};

/** The root-relative path of a stored key, each segment encoded. Same in every adapter. */
export function mediaUrlFor(key: string): string {
  return `/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function createFakeStorage(): FakeStorage {
  const files = new Map<string, StoredFile>();
  return {
    files,
    async put(key, body, contentType) {
      files.set(key, { body: Buffer.from(body), contentType });
    },
    async get(key) {
      const stored = files.get(key);
      return stored
        ? { body: Buffer.from(stored.body), contentType: stored.contentType }
        : null;
    },
    async delete(key) {
      files.delete(key);
    },
    urlFor: mediaUrlFor,
    reset() {
      files.clear();
    },
  };
}
