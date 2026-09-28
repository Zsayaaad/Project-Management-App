import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { syncQueue } from "../../../lib/queues.js";
import { projectService } from "../projects.service.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../errors/customErrors.js";

// 1. Setup the mock transaction object BEFORE defining the jest.mock block
const mockTx = {
  project: { create: jest.fn() },
  projectMember: { create: jest.fn() },
};

jest.mock("../../../lib/prisma.js", () => ({
  prisma: {
    // Intercepts the transaction and immediately runs the callback with our mockTx
    $transaction: jest.fn((cb: any) => cb(mockTx)),
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("../../../lib/queues.js", () => ({
  syncQueue: { add: jest.fn() },
}));

// 👇 ADD THIS MOCK to prevent top-level getEnv() execution
jest.mock("../../../lib/stream.js", () => ({
  streamClient: { channel: jest.fn() },
  chatClient: {},
  videoClient: {},
}));

// 2. Extract typed mocks for clean assertions
const mockProjectCount = prisma.project.count as unknown as jest.Mock;
const mockProjectFindMany = prisma.project.findMany as unknown as jest.Mock;
const mockProjectFindUnique = prisma.project.findUnique as unknown as jest.Mock;
const mockProjectUpdate = prisma.project.update as unknown as jest.Mock;
const mockProjectDelete = prisma.project.delete as unknown as jest.Mock;

const mockMemberFindUnique = prisma.projectMember
  .findUnique as unknown as jest.Mock;
const mockMemberFindMany = prisma.projectMember
  .findMany as unknown as jest.Mock;
const mockMemberDelete = prisma.projectMember.delete as unknown as jest.Mock;
const mockMemberCreate = prisma.projectMember.create as unknown as jest.Mock;

const mockUserFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockQueueAdd = syncQueue.add as unknown as jest.Mock;

describe("Project Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.log from the catch block in createProject during P2002 tests
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("createProject", () => {
    const creatorId = "user-1";
    const input = { name: "Project Alpha", description: "Desc" };
    const mockCreatedProject = {
      id: "proj-1",
      name: "Project Alpha",
      description: "Desc",
      creatorId,
      creator: {
        id: creatorId,
        name: "Jane",
        email: "jane@test.com",
        role: Role.MEMBER,
      },
      members: [],
    };

    it("creates project, member, and enqueues stream job", async () => {
      mockTx.project.create.mockResolvedValueOnce(mockCreatedProject);
      mockTx.projectMember.create.mockResolvedValueOnce({});
      mockQueueAdd.mockResolvedValueOnce({ id: "job-1" });

      const result = await projectService.createProject(creatorId, input);

      expect(mockTx.project.create).toHaveBeenCalledWith({
        data: { name: input.name, description: input.description, creatorId },
        include: expect.any(Object),
      });
      expect(mockTx.projectMember.create).toHaveBeenCalledWith({
        data: { userId: creatorId, projectId: "proj-1" },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "stream.channel.create",
        expect.objectContaining({
          name: "stream.channel.create",
          data: expect.objectContaining({
            projectId: "proj-1",
            projectName: "Project Alpha",
          }),
        }),
        { jobId: "channel-create-proj-1" },
      );
      expect(result).toEqual(mockCreatedProject);
    });

    it("throws ConflictError on P2002 unique constraint violation", async () => {
      //   const prismaError = new Error("Unique constraint failed");
      //   (prismaError as any).code = "P2002";

      // Use Prisma's actual error class so it passes the `instanceof` check
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`name`, `creatorId`)",
        {
          code: "P2002",
          clientVersion: "7.9.0", // Match Prisma version
        },
      );

      mockTx.project.create.mockRejectedValueOnce(prismaError);

      await expect(
        projectService.createProject(creatorId, input),
      ).rejects.toThrow(ConflictError);
    });

    it("rethrows non-P2002 database errors", async () => {
      const dbError = new Error("Database connection lost");
      mockTx.project.create.mockRejectedValueOnce(dbError);

      await expect(
        projectService.createProject(creatorId, input),
      ).rejects.toThrow("Database connection lost");
    });
  });

  describe("getAllProjects", () => {
    const userId = "user-1";
    const baseQuery = {
      search: undefined,
      limit: 4,
      page: 1,
      sort: "newest" as const,
    };

    it("allows Admin to see all projects", async () => {
      mockProjectCount.mockResolvedValueOnce(0);
      mockProjectFindMany.mockResolvedValueOnce([]);

      await projectService.getAllProjects(userId, Role.ADMIN, baseQuery);

      expect(mockProjectCount).toHaveBeenCalledWith({ where: {} });
    });

    it("restricts Members to projects they belong to", async () => {
      mockProjectCount.mockResolvedValueOnce(0);
      mockProjectFindMany.mockResolvedValueOnce([]);

      await projectService.getAllProjects(userId, Role.MEMBER, baseQuery);

      expect(mockProjectCount).toHaveBeenCalledWith({
        where: { members: { some: { userId } } },
      });
    });

    it("applies search filter case-insensitively", async () => {
      mockProjectCount.mockResolvedValueOnce(0);
      mockProjectFindMany.mockResolvedValueOnce([]);
      const searchQuery = { ...baseQuery, search: "alpha" };

      await projectService.getAllProjects(userId, Role.ADMIN, searchQuery);

      expect(mockProjectCount).toHaveBeenCalledWith({
        where: { name: { contains: "alpha", mode: "insensitive" } },
      });
    });
  });

  describe("getProjectById", () => {
    it("returns project with relations", async () => {
      const mockProject = { id: "proj-1", name: "Alpha" };
      mockProjectFindUnique.mockResolvedValueOnce(mockProject);

      const result = await projectService.getProjectById("proj-1");

      expect(mockProjectFindUnique).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockProject);
    });
  });

  describe("updateProject", () => {
    const projectId = "proj-1";

    it("enqueues stream.channel.update when name is updated", async () => {
      mockProjectUpdate.mockResolvedValueOnce({
        id: projectId,
        name: "New Name",
      });

      await projectService.updateProject(projectId, { name: "New Name" });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        "stream.channel.update",
        expect.objectContaining({
          name: "stream.channel.update",
          data: { projectId, name: "New Name" },
        }),
      );
    });

    it("does not enqueue stream job when only description is updated", async () => {
      mockProjectUpdate.mockResolvedValueOnce({
        id: projectId,
        description: "New Desc",
      });

      await projectService.updateProject(projectId, {
        description: "New Desc",
      });

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  describe("deleteProject", () => {
    const projectId = "proj-1";

    it("deletes project and enqueues stream.channel.delete", async () => {
      mockProjectDelete.mockResolvedValueOnce({});

      const result = await projectService.deleteProject(projectId);

      expect(mockProjectDelete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "stream.channel.delete",
        expect.objectContaining({
          name: "stream.channel.delete",
          data: { projectId },
        }),
        { jobId: `channel-delete-${projectId}` },
      );
      expect(result).toEqual({ message: "Project deleted successfully" });
    });
  });

  describe("getProjectMembers", () => {
    it("returns mapped user objects", async () => {
      const mockMembers = [
        {
          id: "mem-1",
          user: {
            id: "user-1",
            name: "Jane",
            email: "jane@test.com",
            role: Role.MEMBER,
          },
        },
      ];
      mockMemberFindMany.mockResolvedValueOnce(mockMembers);

      const result = await projectService.getProjectMembers("proj-1");

      expect(mockMemberFindMany).toHaveBeenCalledWith({
        where: { projectId: "proj-1" },
        include: expect.any(Object),
      });
      expect(result).toEqual([mockMembers[0].user]);
    });
  });

  describe("addMember", () => {
    const projectId = "proj-1";
    const addedById = "user-1";
    const input = { email: "newmember@test.com" };
    const mockUser = {
      id: "user-2",
      name: "New Member",
      email: "newmember@test.com",
      role: Role.MEMBER,
    };

    it("throws NotFoundError if user does not exist", async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);
      await expect(
        projectService.addMember(projectId, input, addedById),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError if user is already a member", async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockMemberFindUnique.mockResolvedValueOnce({
        userId: mockUser.id,
        projectId,
      });

      await expect(
        projectService.addMember(projectId, input, addedById),
      ).rejects.toThrow(ConflictError);
    });

    it("adds member and enqueues stream.member.add on success", async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockMemberFindUnique.mockResolvedValueOnce(null);
      mockMemberCreate.mockResolvedValueOnce({});

      await projectService.addMember(projectId, input, addedById);

      expect(mockMemberCreate).toHaveBeenCalledWith({
        data: { userId: mockUser.id, projectId },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "stream.member.add",
        expect.objectContaining({
          name: "stream.member.add",
          data: expect.objectContaining({
            projectId,
            userId: mockUser.id,
            addedById,
          }),
        }),
      );
    });
  });

  describe("removeMember", () => {
    const projectId = "proj-1";
    const requesterId = "user-1";

    it("throws BadRequestError if user tries to remove themselves", async () => {
      await expect(
        projectService.removeMember(projectId, requesterId, requesterId),
      ).rejects.toThrow(BadRequestError);
    });

    it("throws NotFoundError if membership does not exist", async () => {
      mockMemberFindUnique.mockResolvedValueOnce(null);
      await expect(
        projectService.removeMember(projectId, "user-2", requesterId),
      ).rejects.toThrow(NotFoundError);
    });

    it("removes member and enqueues stream.member.remove on success", async () => {
      mockMemberFindUnique.mockResolvedValueOnce({
        userId: "user-2",
        projectId,
        user: { name: "Member 2" },
      });
      mockMemberDelete.mockResolvedValueOnce({});

      await projectService.removeMember(projectId, "user-2", requesterId);

      expect(mockMemberDelete).toHaveBeenCalledWith({
        where: { userId_projectId: { userId: "user-2", projectId } },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        "stream.member.remove",
        expect.objectContaining({
          name: "stream.member.remove",
          data: expect.objectContaining({
            projectId,
            userId: "user-2",
            requesterId,
          }),
        }),
      );
    });
  });
});
