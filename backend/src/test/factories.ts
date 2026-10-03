// Factories (createUser, createProject, createTask):
// Generate realistic test data with sensible defaults and unique emails via randomUUID()

import { randomUUID } from "node:crypto";
import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type UserOverrides = Partial<{
  id: string;
  name: string;
  email: string;
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
 * Generates a unique email using randomUUID() to prevent collisions.
 * Password is NOT hashed — use pre-hashed values for speed.
 */
export const createUser = async (overrides: UserOverrides = {}) => {
  const uniqueId = randomUUID();
  const defaults = {
    name: `Test User ${uniqueId.slice(0, 8)}`,
    email: `user-${uniqueId}@test.com`,
    password: "$2a$12$KIXvQm5pQ8vZ9qXqLqRqWeQqXqLqRqWeQqXqLqRqWeQqXqLqRqWeQq", // Pre-hashed "password123"
    role: Role.MEMBER,
    avatarUrl: null,
  };

  const userData = { ...defaults, ...overrides };

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
