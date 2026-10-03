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
 * Table names are discovered dynamically from pg_tables so this
 * never drifts from the Prisma schema.
 * Uses RESTART IDENTITY CASCADE to reset auto-increment counters
 * and handle foreign key dependencies.
 */
export const resetDb = async () => {
  if (!isTestEnvironment()) {
    throw new Error(
      "Safety guard: resetDb() can only run in test environment with local test database",
    );
  }

  // Discover all table names dynamically from the public schema
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  if (tables.length === 0) {
    return; // No tables yet (migrations not run)
  }

  // Truncate all tables in a single statement to avoid ordering issues
  const tableNames = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
  );
};

/**
 * Flushes all keys from the test Redis instance.
 */
export const flushRedis = async () => {
  if (!isTestEnvironment()) {
    throw new Error(
      "Safety guard: flushRedis() can only run in test environment with local test Redis",
    );
  }

  await redisClient.flushdb();
};
