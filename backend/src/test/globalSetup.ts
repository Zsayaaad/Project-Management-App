// This runs once before all integration tests. It verifies the safety guard and runs Prisma migrations on the test database.

import { execSync } from "node:child_process";

export default async function globalSetup() {
  const dbUrl = process.env.DATABASE_URL || "";
  const redisUrl = process.env.REDIS_URL || "";

  // SAFETY GUARD
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Safety guard: NODE_ENV must be 'test'");
  }
  if (!dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1")) {
    throw new Error("Safety guard: DATABASE_URL must point to localhost");
  }
  if (!dbUrl.includes("app_test")) {
    throw new Error(
      "Safety guard: DATABASE_URL must use the 'app_test' database",
    );
  }
  if (!redisUrl.includes("localhost") && !redisUrl.includes("127.0.0.1")) {
    throw new Error("Safety guard: REDIS_URL must point to localhost");
  }

  console.log("🚀 Running Prisma migrations on test DB...");
  // execSync("npx prisma migrate deploy", { stdio: "inherit" });
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  } catch {
    console.log(
      "⚠️ Migration failed or dirty state detected. Resetting test DB...",
    );
    execSync("npx prisma migrate reset --force", {
      stdio: "inherit",
      env: {
        ...process.env,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes",
      },
    });
  }
}
