import { prisma } from "../lib/prisma.js";
import { resetDb } from "./dbHelpers.js";
import {
  createUser,
  createProject,
  createProjectMember,
  createTask,
} from "./factories.js";

describe("Smoke Test — Infrastructure", () => {
  it("DB is reachable and migrations are applied", async () => {
    // If this doesn't throw, the DB is reachable and tables exist
    const result = await prisma.$queryRaw<Array<{ ok: number }>>`
      SELECT 1 AS ok
    `;
    expect(result).toEqual([{ ok: 1 }]);
  });

  it("resetDb clears all data", async () => {
    // Create a user
    const user = await createUser();
    expect(user.id).toBeDefined();

    // Reset the DB
    await resetDb();

    // Verify the user is gone
    const found = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(found).toBeNull();
  });

  it("factories create valid related records", async () => {
    const creator = await createUser();
    const member = await createUser();
    const project = await createProject({ creatorId: creator.id });
    await createProjectMember({
      userId: member.id,
      projectId: project.id,
    });
    const task = await createTask({
      projectId: project.id,
      creatorId: creator.id,
      assigneeId: member.id,
    });

    expect(project.creatorId).toBe(creator.id);
    expect(task.projectId).toBe(project.id);
    expect(task.creatorId).toBe(creator.id);
    expect(task.assigneeId).toBe(member.id);
  });

  it("safety guard refuses a non-test DATABASE_URL", async () => {
    const originalUrl = process.env.DATABASE_URL;

    try {
      // Point to a production-looking URL that should be rejected
      process.env.DATABASE_URL =
        "postgresql://user:pass@prod-host:5432/prod_db";

      await expect(resetDb()).rejects.toThrow("Safety guard");
    } finally {
      // Always restore the correct URL
      process.env.DATABASE_URL = originalUrl;
    }
  });
});
