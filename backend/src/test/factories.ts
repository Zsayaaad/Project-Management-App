// Factories (createUser, createProject, createTask):
// Generate realistic test data with sensible defaults and unique emails via randomUUID()

import { randomUUID } from "node:crypto";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/hash.js";

type UserOverrides = Partial<{
  id: string;
  name: string;
  email: string;
  // Plain-text password. Will be hashed with the configured cost factor (4 in test env)
  password: string;
  role: Role;
  avatarUrl: string | null;
}>;

type ProjectOverrides = Partial<{
  id: string;
  name: string;
  description: string;
}> & {
  creatorId: string;
};

type TaskOverrides = Partial<{
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
}> & {
  projectId: string;
  creatorId: string;
  assigneeId: string;
};

type ProjectMemberOverrides = {
  userId: string;
  projectId: string;
};

/**
 * Creates a test user in the database.
 * Accepts a plain-text password and hashes it with the configured cost factor.
 * In the test env, BCRYPT_SALT_ROUNDS=4 so hashing takes ~1ms instead of ~100ms.
 */
export const createUser = async (overrides: UserOverrides = {}) => {
  const uniqueId = randomUUID();

  const plainPassword = overrides.password ?? "password123";
  const hashedPassword = await hashPassword(plainPassword);

  const defaults = {
    name: `Test User ${uniqueId.slice(0, 8)}`,
    email: `user-${uniqueId}@test.com`,
    password: hashedPassword,
    role: Role.MEMBER,
    avatarUrl: null,
  };

  // Remove password from overrides since we already hashed it
  const { password: _pw, ...restOverrides } = overrides;
  const userData = { ...defaults, ...restOverrides };

  return prisma.user.create({
    data: userData,
    omit: { password: true },
  });
};

/**
 * Creates a test project in the database.
 * Requires a creatorId (use createUser() first).
 */
export const createProject = async (overrides: ProjectOverrides) => {
  if (!overrides.creatorId) {
    throw new Error("createProject requires a creatorId");
  }

  const uniqueId = randomUUID();
  const defaults = {
    name: `Test Project ${uniqueId.slice(0, 8)}`,
    description: `Test description for project ${uniqueId.slice(0, 8)}`,
  };

  const projectData = { ...defaults, ...overrides };

  return prisma.project.create({
    data: projectData,
  });
};

/**
 * Creates a project membership (join table record).
 * Useful for making a user a member of a project.
 */
export const createProjectMember = async (
  overrides: ProjectMemberOverrides,
) => {
  if (!overrides.userId || !overrides.projectId) {
    throw new Error("createProjectMember requires userId and projectId");
  }

  return prisma.projectMember.create({
    data: {
      userId: overrides.userId,
      projectId: overrides.projectId,
    },
  });
};

/**
 * Creates a test task in the database.
 * Requires projectId, creatorId, and assigneeId (use createUser() and createProject() first).
 */
export const createTask = async (overrides: TaskOverrides) => {
  if (!overrides.projectId || !overrides.creatorId || !overrides.assigneeId) {
    throw new Error("createTask requires projectId, creatorId, and assigneeId");
  }

  const uniqueId = randomUUID();
  const defaults = {
    title: `Test Task ${uniqueId.slice(0, 8)}`,
    description: `Test description for task ${uniqueId.slice(0, 8)}`,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  const taskData = { ...defaults, ...overrides };

  return prisma.task.create({
    data: taskData,
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
  });
};
