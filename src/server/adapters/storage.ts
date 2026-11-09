import 'server-only';

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
  return {
    files: new Map(),
    put: async () => {},
    delete: async () => {},
    urlFor: (key) => key,
    reset: () => {},
  };
}
