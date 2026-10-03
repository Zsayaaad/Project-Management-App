// This runs before every test file. It globally mocks third-party boundaries (Stream, ImageKit, BullMQ)
// and ensures connections are closed after each file to prevent "open handle" warnings.

import { prisma } from "../lib/prisma.js";
import { redisClient } from "../lib/redis.js";
import { queueConnection } from "../lib/queueConnection.js";
import { resetDb, flushRedis } from "./dbHelpers.js";

// Mock third-party boundaries globally
jest.mock("../lib/stream.js", () => ({
  chatClient: {
    upsertUsers: jest.fn(),
    channel: jest.fn(),
    createToken: jest.fn(),
  },
  videoClient: { upsertUsers: jest.fn(), generateUserToken: jest.fn() },
  streamClient: {
    upsertUsers: jest.fn(),
    channel: jest.fn(),
    createToken: jest.fn(),
  },
}));

jest.mock("../lib/imagekit.js", () => ({
  imagekit: {
    deleteFile: jest.fn(),
    getAuthenticationParameters: jest.fn(),
  },
}));

jest.mock("../lib/queues.js", () => ({
  syncQueue: { add: jest.fn().mockResolvedValue({ id: "mock-job-id" }) },
}));

jest.mock("../workers/sync.worker.js", () => ({
  syncWorker: { close: jest.fn() },
}));

beforeEach(async () => {
  // Reset database and Redis before each test
  await resetDb();
  await flushRedis();
});

afterAll(async () => {
  // Close connections to prevent open handle warnings
  await prisma.$disconnect();
  await redisClient.quit();
  await queueConnection.quit();
});
