// This file contains the resetDb() and flushRedis() helpers with safety guards.
/**
 * resetDb() — Wipes all tables between tests so each test starts clean
 * flushRedis() — Clears the test Redis instance between tests
 * Safety guards — Every helper checks NODE_ENV=test before touching the database or Redis
 */

import { prisma } from "../lib/prisma.js";
import { redisClient } from "../lib/redis.js";

const isTestEnvironment = () => {
  const isTest = process.env.NODE_ENV === "test";
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocalDb = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
  const isTestDb = dbUrl.includes("app_test");
  const redisUrl = process.env.REDIS_URL || "";
  const isLocalRedis =
    redisUrl.includes("localhost") || redisUrl.includes("127.0.0.1");

  return isTest && isLocalDb && isTestDb && isLocalRedis;
};

/**
 * Truncates all tables in the test database.
 * Uses RESTART IDENTITY CASCADE to reset auto-increment counters and handle foreign keys.
 * Safety guard: Only runs when NODE_ENV=test and DATABASE_URL points to localhost/app_test.
 */
export const resetDb = async () => {
  if (!isTestEnvironment()) {
    throw new Error(
      "Safety guard: resetDb() can only run in test environment with local test database",
    );
  }

  const tables = ["Task", "ProjectMember", "Project", "User"];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`,
    );
  }
};

/**
 * Flushes all keys from the test Redis instance.
 * Safety guard: Only runs when NODE_ENV=test and REDIS_URL points to localhost.
 */
export const flushRedis = async () => {
  if (!isTestEnvironment()) {
    throw new Error(
      "Safety guard: flushRedis() can only run in test environment with local test Redis",
    );
  }

  await redisClient.flushdb();
};
