import 'server-only';
import { getConfig } from '@/server/config';

/** Keeps uploaded files. Phase 4 decides the real media route (ARC-15). */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

export type StoredFile = { body: Buffer; contentType: string };

export type FakeStorage = Storage & {
  files: Map<string, StoredFile>;
  reset(): void;
};

export function createFakeStorage(): FakeStorage {
  const files = new Map<string, StoredFile>();
  return {
    files,
    async put(key, body, contentType) {
      files.set(key, { body: Buffer.from(body), contentType });
    },
    async delete(key) {
      files.delete(key);
    },
    urlFor(key) {
      return `${getConfig().appOrigin}/storage/${encodeURIComponent(key)}`;
    },
    reset() {
      files.clear();
    },
  };
}
