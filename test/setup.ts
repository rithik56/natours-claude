import mongoose from 'mongoose';
import { afterAll, beforeEach, inject, vi } from 'vitest';
import { resetFakes } from './helpers/fakes';
import {
  cookieStore,
  requestHeaders,
  resetRequestContext,
} from './helpers/request-context';

const globals = globalThis as typeof globalThis & { __natoursMongo?: unknown };

// A database name unique to this test file keeps parallel workers apart (Q7).
const databaseName = `natours-test-${crypto.randomUUID()}`;
process.env.MONGODB_URI = `${inject('mongoUri').replace(/\/$/, '')}/${databaseName}`;

// Pages and Server Actions read the session cookie and request ID from next/headers.
// Tests use mockSession() to put a real signed cookie in this store.
vi.mock('next/headers', () => ({
  cookies: async () => cookieStore,
  headers: async () => requestHeaders,
}));

beforeEach(resetRequestContext);

// Every test starts with empty mail, queue, storage, Stripe, rate-limit and cache fakes (Q7).
beforeEach(resetFakes);

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  delete globals.__natoursMongo;
});
