import { Role, TaskStatus } from "@prisma/client";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/customErrors.js";
import { syncQueue } from "../../../lib/queues.js";
import {
  createProjectMember,
  createUser,
  createProject as factoryCreateProject,
  createTask as factoryCreateTask,
} from "../../../test/factories.js";
import { createTask, deleteTask, updateTask } from "../task.service.js";
import { prisma } from "../../../lib/prisma.js";

describe("Tasks Service (Integration)", () => {
  describe("createTask", () => {
    it("creates task and enqueues stream.announce", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({
        userId: creator.id,
        projectId: project.id,
      });
      await createProjectMember({
        userId: assignee.id,
        projectId: project.id,
      });

      const task = await createTask(
        project.id,
        creator.id,
        {
          title: "Build Auth",
          description: "Implement JWT authentication",
          dueDate: "2026-12-01",
          assigneeId: assignee.id,
        },
        { userId: creator.id, name: creator.name },
      );

      expect(task.title).toBe("Build Auth");
      expect(task.creatorId).toBe(creator.id);
      expect(task.assigneeId).toBe(assignee.id);

      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.announce",
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: project.id,
            senderId: creator.id,
          }),
        }),
      );
    });

    it("throws NotFoundError when assignee does not exist", async () => {
      const creator = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({ userId: creator.id, projectId: project.id });

      const promise = createTask(
        project.id,
        creator.id,
        {
          title: "Build Auth",
          description: "Implement JWT",
          dueDate: "2026-12-01",
          assigneeId: "00000000-0000-0000-0000-000000000000",
        },
        { userId: creator.id, name: creator.name },
      );

      await expect(promise).rejects.toThrow(NotFoundError);
      await expect(promise).rejects.toThrow("Assignee user not found");
    });

    it("throws BadRequestError when assignee is not a project member", async () => {
      const creator = await createUser();
      const nonMember = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({ userId: creator.id, projectId: project.id });
      // nonMember is NOT added to the project

      const promise = createTask(
        project.id,
        creator.id,
        {
          title: "Build Auth",
          description: "Implement JWT",
          dueDate: "2026-12-01",
          assigneeId: nonMember.id,
        },
        { userId: creator.id, name: creator.name },
      );

      await expect(promise).rejects.toThrow(BadRequestError);
      await expect(promise).rejects.toThrow(
        "Assignee must be a member of this project",
      );
    });

    it("throws BadRequestError when task title already exists in project (case-insensitive)", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });

      await createTask(
        project.id,
        creator.id,
        {
          title: "Build Auth",
          description: "First task",
          dueDate: "2026-12-01",
          assigneeId: assignee.id,
        },
        { userId: creator.id, name: creator.name },
      );

      const promise = createTask(
        project.id,
        creator.id,
        {
          title: "build auth", // different case, same title
          description: "Duplicate task",
          dueDate: "2026-12-01",
          assigneeId: assignee.id,
        },
        { userId: creator.id, name: creator.name },
      );

      await expect(promise).rejects.toThrow(BadRequestError);
      await expect(promise).rejects.toThrow(
        "A task with the same title already exists in this project",
      );
    });
  });

  describe("updateTask", () => {
    it("throws UnauthorizedError when caller is not admin, creator, or assignee", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const randomMember = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });
      await createProjectMember({
        userId: randomMember.id,
        projectId: project.id,
      });

      const task = await factoryCreateTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      const promise = updateTask(
        project.id,
        task.id,
        { status: TaskStatus.DONE },
        { userId: randomMember.id, role: Role.MEMBER, name: randomMember.name },
      );

      await expect(promise).rejects.toThrow(UnauthorizedError);
      await expect(promise).rejects.toThrow(
        "You do not have permission to update this task",
      );
    });

    it("throws BadRequestError when creator reassigns to a non-member", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const nonMember = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });
      // nonMember is NOT added to the project

      const task = await factoryCreateTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      const promise = updateTask(
        project.id,
        task.id,
        { assigneeId: nonMember.id },
        { userId: creator.id, role: Role.MEMBER, name: creator.name },
      );

      await expect(promise).rejects.toThrow(BadRequestError);
      await expect(promise).rejects.toThrow(
        "Assignee must be a member of this project",
      );
    });

    it("enqueues stream.announce when task fields change", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });

      const task = await factoryCreateTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: assignee.id,
        status: TaskStatus.TODO,
      });

      await updateTask(
        project.id,
        task.id,
        { status: TaskStatus.IN_PROGRESS },
        { userId: creator.id, role: Role.MEMBER, name: creator.name },
      );

      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.announce",
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: project.id,
            senderId: creator.id,
          }),
        }),
      );
    });

    it("does NOT enqueue stream.announce when only description changes", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });
      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });

      const task = await factoryCreateTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      await updateTask(
        project.id,
        task.id,
        { description: "Only description changed" },
        { userId: creator.id, role: Role.MEMBER, name: creator.name },
      );

      expect(jest.mocked(syncQueue.add)).not.toHaveBeenCalled();
    });
  });

  describe("deleteTask", () => {
    it("throws UnauthorizedError when assignee tries to delete", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });

      const task = await factoryCreateTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      const promise = deleteTask(project.id, task.id, {
        userId: assignee.id,
        role: Role.MEMBER,
        name: assignee.name,
      });

      await expect(promise).rejects.toThrow(UnauthorizedError);
      await expect(promise).rejects.toThrow(
        "You do not have permission to delete this task",
      );
    });

    it("deletes task and enqueues stream.announce", async () => {
      const creator = await createUser();
      const assignee = await createUser();
      const project = await factoryCreateProject({ creatorId: creator.id });

      await createProjectMember({ userId: creator.id, projectId: project.id });
      await createProjectMember({ userId: assignee.id, projectId: project.id });

      const task = await factoryCreateTask({
        projectId: project.id,
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      const result = await deleteTask(project.id, task.id, {
        userId: creator.id,
        role: Role.MEMBER,
        name: creator.name,
      });

      expect(result.message).toBe("Task deleted successfully");

      expect(
        await prisma.task.findUnique({ where: { id: task.id } }),
      ).toBeNull();

      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "stream.announce",
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: project.id,
            senderId: creator.id,
          }),
        }),
      );
    });
  });
});
