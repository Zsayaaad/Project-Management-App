import { Role } from "@prisma/client";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../errors/customErrors.js";
import { prisma } from "../../../lib/prisma.js";
import { syncQueue } from "../../../lib/queues.js";
import {
  createProjectMember,
  createTask,
  createUser,
  createProject as factoryCreateProject,
} from "../../../test/factories.js";
import {
  addMember,
  createProject,
  deleteProject,
  getAllProjects,
  removeMember,
  updateProject,
} from "../projects.service.js";

describe("Projects Service (Integration)", () => {
  describe("createProject", () => {
    it("creates project and creator membership atomically", async () => {
      const creator = await createUser();

      const project = await createProject(creator.id, {
        name: "My New Project",
        description: "A test project",
      });

      // Assert project was created with correct data
      expect(project.name).toBe("My New Project");
      expect(project.creatorId).toBe(creator.id);

      // Assert membership was created in the same transaction
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: creator.id, projectId: project.id },
        },
      });
      expect(membership).not.toBeNull();
    });

    it("throws ConflictError when same creator creates duplicate project name", async () => {
      const creator = await createUser();
      await createProject(creator.id, { name: "Duplicate Name" });

      const duplicate = createProject(creator.id, { name: "Duplicate Name" });

      await expect(duplicate).rejects.toThrow(ConflictError);
      await expect(duplicate).rejects.toThrow(
        "You already have a project with this name",
      );
    });

    it("enqueues stream.channel.create job with correct payload", async () => {
      const creator = await createUser();

      const project = await createProject(creator.id, {
        name: "Job Test Project",
      });

      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.channel.create",
        // expect.objectContaining({
        //   name: "stream.channel.create",
        //   data: expect.objectContaining({
        //     projectId: project.id,
        //     projectName: "Job Test Project",
        //     creatorId: creator.id,
        //     creatorName: creator.name,
        //   }),
        // }),
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: project.id,
            projectName: "Job Test Project",
            creatorId: creator.id,
          }),
        }),
        expect.objectContaining({
          jobId: `channel-create-${project.id}`,
        }),
      );
    });
  });

  describe("getAllProjects", () => {
    it("MEMBER sees only projects they belong to", async () => {
      const member = await createUser();
      const otherUser = await createUser();

      // Create project that member belongs to
      const memberProject = await factoryCreateProject({
        creatorId: member.id,
      });

      await createProjectMember({
        userId: member.id,
        projectId: memberProject.id,
      });

      // Create project that member does NOT belong to
      await factoryCreateProject({ creatorId: otherUser.id });

      const result = await getAllProjects(member.id, Role.MEMBER, {
        page: 1,
        limit: 10,
        sort: "newest",
        search: "",
      });

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe(memberProject.id);
    });

    it("ADMIN sees all projects regardless of membership", async () => {
      const admin = await createUser({ role: Role.ADMIN });
      const user1 = await createUser();
      const user2 = await createUser();

      await factoryCreateProject({ creatorId: user1.id });
      await factoryCreateProject({ creatorId: user2.id });

      const result = await getAllProjects(admin.id, Role.ADMIN, {
        page: 1,
        limit: 10,
        sort: "newest",
        search: "",
      });

      expect(result.projects).toHaveLength(2);
    });
  });

  describe("updateProject", () => {
    it("updates project fields in the database", async () => {
      const creator = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      const updated = await updateProject(project.id, {
        name: "Updated Name",
        description: "Updated description",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Updated description");
    });

    it("enqueues stream.channel.update when name changes", async () => {
      const creator = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await updateProject(project.id, { name: "New Channel Name" });

      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.channel.update",
        expect.objectContaining({
          name: "stream.channel.update",
          data: { projectId: project.id, name: "New Channel Name" },
        }),
      );
    });

    it("does NOT enqueue job when only description changes", async () => {
      const creator = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await updateProject(project.id, {
        description: "Only description changed",
      });

      expect(jest.mocked(syncQueue.add)).not.toHaveBeenCalled();
    });
  });

  describe("deleteProject", () => {
    it("deletes project and cascades to memberships and tasks", async () => {
      const creator = await createUser();
      const member = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: member.id, projectId: project.id });
      await createTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: member.id,
      });

      const result = await deleteProject(project.id);

      expect(result.message).toBe("Project deleted successfully");

      // Verify project is gone
      expect(
        await prisma.project.findUnique({ where: { id: project.id } }),
      ).toBeNull();

      // Verify memberships are cascade-deleted
      expect(
        await prisma.projectMember.findMany({
          where: { projectId: project.id },
        }),
      ).toHaveLength(0);

      // Verify tasks are cascade-deleted
      expect(
        await prisma.task.findMany({ where: { projectId: project.id } }),
      ).toHaveLength(0);
    });
  });

  describe("addMember", () => {
    it("adds a new member and enqueues stream.member.add", async () => {
      const creator = await createUser();
      const newMember = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      const result = await addMember(
        project.id,
        { email: newMember.email },
        creator.id,
      );

      expect(result.id).toBe(newMember.id);

      // Verify membership exists in DB
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: newMember.id, projectId: project.id },
        },
      });
      expect(membership).not.toBeNull();

      // Verify job was enqueued
      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.member.add",
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: project.id,
            userId: newMember.id,
            addedById: creator.id,
          }),
        }),
      );
    });

    it("throws NotFoundError when user email does not exist", async () => {
      const creator = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      const promise = addMember(
        project.id,
        { email: "nonexistent@test.com" },
        creator.id,
      );

      await expect(promise).rejects.toThrow(NotFoundError);

      await expect(promise).rejects.toThrow("User not found");
    });

    it("throws ConflictError when user is already a member", async () => {
      const creator = await createUser();
      const existingMember = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({
        userId: existingMember.id,
        projectId: project.id,
      });

      const promise = addMember(
        project.id,
        { email: existingMember.email },
        creator.id,
      );

      await expect(promise).rejects.toThrow(ConflictError);

      await expect(promise).rejects.toThrow(
        "User is already a member of this project",
      );
    });
  });

  describe("removeMember", () => {
    it("throws BadRequestError when user tries to remove themselves", async () => {
      const creator = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({ userId: creator.id, projectId: project.id });

      const promise = removeMember(project.id, creator.id, creator.id);

      await expect(promise).rejects.toThrow(BadRequestError);
      await expect(promise).rejects.toThrow(
        "You cannot remove yourself from the project",
      );
    });

    it("removes member and enqueues stream.member.remove", async () => {
      const creator = await createUser();
      const member = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({ userId: member.id, projectId: project.id });

      await removeMember(project.id, member.id, creator.id);

      // Verify membership is deleted
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: { userId: member.id, projectId: project.id },
        },
      });
      expect(membership).toBeNull();

      // Verify job was enqueued
      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.member.remove",
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: project.id,
            userId: member.id,
            requesterId: creator.id,
          }),
        }),
      );
    });
  });
});
