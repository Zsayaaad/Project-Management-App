import { UnauthorizedError } from "../../../errors/customErrors.js";
import { prisma } from "../../../lib/prisma.js";
import { syncQueue } from "../../../lib/queues.js";
import {
  createProjectMember,
  createTask,
  createUser,
  createProject as factoryCreateProject,
} from "../../../test/factories.js";
import { comparePassword } from "../../../utils/hash.js";
import {
  changePassword,
  deleteAccount,
  updateAvatar,
} from "../user.service.js";

describe("Users Service (Integration)", () => {
  describe("updateAvatar", () => {
    it("enqueues imagekit.delete when user has existing avatar", async () => {
      const user = await createUser({
        avatarUrl: "https://ik.imagekit.io/test/avatars/old-avatar.jpg",
      });

      await updateAvatar(user.id, {
        avatarUrl: "https://ik.imagekit.io/test/avatars/new-avatar.jpg",
      });

      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "imagekit.delete",
        expect.objectContaining({
          name: "imagekit.delete",
          data: { fileName: "old-avatar.jpg" },
        }),
      );
    });

    it("does NOT enqueue imagekit.delete when user has no avatar", async () => {
      const user = await createUser({ avatarUrl: null });

      await updateAvatar(user.id, {
        avatarUrl: "https://ik.imagekit.io/test/avatars/new-avatar.jpg",
      });

      expect(jest.mocked(syncQueue.add)).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    it("throws UnauthorizedError when current password is incorrect", async () => {
      const user = await createUser({ password: "correctPassword" });

      const promise = changePassword(user.id, {
        currentPassword: "wrongPassword",
        newPassword: "newPassword123",
        confirmNewPassword: "newPassword123",
      });

      await expect(promise).rejects.toThrow(UnauthorizedError);
      await expect(promise).rejects.toThrow("current password is incorrect");
    });

    it("updates password hash when current password is valid", async () => {
      const user = await createUser({ password: "oldPassword123" });

      await changePassword(user.id, {
        currentPassword: "oldPassword123",
        newPassword: "newPassword456",
        confirmNewPassword: "newPassword456",
      });

      // Verify the new password works against the stored hash
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(await comparePassword("newPassword456", dbUser!.password)).toBe(
        true,
      );

      // Verify the old password no longer works
      expect(await comparePassword("oldPassword123", dbUser!.password)).toBe(
        false,
      );
    });
  });

  describe("deleteAccount", () => {
    it("throws UnauthorizedError when password is incorrect", async () => {
      const user = await createUser({ password: "correctpassword" });

      const promise = deleteAccount(user.id, { password: "wrongpassword" });

      await expect(promise).rejects.toThrow(UnauthorizedError);
      await expect(promise).rejects.toThrow("Password is incorrect");
    });

    it("deletes user, cascades memberships and owned entities, enqueues imagekit.delete", async () => {
      const user = await createUser({
        password: "mypassword123",
        avatarUrl: "https://ik.imagekit.io/test/avatars/avatar.jpg",
      });
      const otherUser = await createUser();
      const project = await factoryCreateProject({ creatorId: user.id });
      await createProjectMember({ userId: user.id, projectId: project.id });
      await createProjectMember({
        userId: otherUser.id,
        projectId: project.id,
      });

      const task = await createTask({
        projectId: project.id,
        creatorId: user.id,
        assigneeId: otherUser.id,
      });

      const result = await deleteAccount(user.id, {
        password: "mypassword123",
      });

      expect(result.message).toBe("Account deleted successfully");

      // Verify user is gone
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).toBeNull();

      // Verify memberships are cascade-deleted
      expect(
        await prisma.projectMember.findMany({ where: { userId: user.id } }),
      ).toHaveLength(0);

      // Verify project created by the deleted user is also cascade-deleted.
      // Architecture doc: "cascades to project memberships and owned entities"
      expect(
        await prisma.project.findUnique({ where: { id: project.id } }),
      ).toBeNull();

      // Verify tasks in the deleted project are also cascade-deleted
      expect(
        await prisma.task.findUnique({ where: { id: task.id } }),
      ).toBeNull();

      // Verify imagekit.delete was enqueued for the avatar
      expect(jest.mocked(syncQueue.add)).toHaveBeenCalledWith(
        "imagekit.delete",
        expect.objectContaining({
          data: { fileName: "avatar.jpg" },
        }),
      );
    });
  });
});
