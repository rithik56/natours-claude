import mongoose from 'mongoose';
import { afterAll, inject } from 'vitest';

const globals = globalThis as typeof globalThis & { __natoursMongo?: unknown };

// A database name unique to this test file keeps parallel workers apart (Q7).
const databaseName = `natours-test-${crypto.randomUUID()}`;
process.env.MONGODB_URI = `${inject('mongoUri').replace(/\/$/, '')}/${databaseName}`;

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  delete globals.__natoursMongo;
});
