// This file is only used by integration tests.
// It imports the real Prisma/Redis clients and resets the database before each test.

import { prisma } from "../lib/prisma.js";
import { redisClient } from "../lib/redis.js";
import { queueConnection } from "../lib/queueConnection.js";
import { resetDb, flushRedis } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDb();
  await flushRedis();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
  await queueConnection.quit();
});
