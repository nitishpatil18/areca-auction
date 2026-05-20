import { afterAll, afterEach, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// set env BEFORE any service module is imported (services read env at top-level)
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.JWT_EXPIRES = '1h';
process.env.MIN_BID_INCREMENT = '1';
process.env.ANTISNIPE_WINDOW_MS = '5000';   // 5s window for fast tests
process.env.ANTISNIPE_EXTEND_MS = '5000';   // extend by 5s

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
