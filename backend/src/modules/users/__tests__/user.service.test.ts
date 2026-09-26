import {
  NotFoundError,
  UnauthorizedError,
} from "../../../errors/customErrors.js";
import { prisma } from "../../../lib/prisma.js";
import { syncQueue } from "../../../lib/queues.js";
import { comparePassword, hashPassword } from "../../../utils/hash.js";
import { userService } from "../user.service.js";

jest.mock("../../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../../../lib/queues.js", () => ({
  syncQueue: { add: jest.fn() },
}));

jest.mock("../../../utils/hash.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

const mockFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockUpdate = prisma.user.update as unknown as jest.Mock;
const mockDelete = prisma.user.delete as unknown as jest.Mock;
const mockQueueAdd = syncQueue.add as unknown as jest.Mock;
const mockHashPassword = hashPassword as unknown as jest.Mock;
const mockComparePassword = comparePassword as unknown as jest.Mock;

describe("User Service", () => {
  const userId = "user-1";
  const dbUser = {
    id: userId,
    name: "Jane",
    email: "jane@example.com",
    password: "hashed",
    avatarUrl: "https://ik.imagekit.io/old-avatar.jpg",
  };

  describe("getCurrentUser", () => {
    it("returns user without password when found", async () => {
      const { password, ...userWithoutPassword } = dbUser;
      mockFindUnique.mockResolvedValueOnce(userWithoutPassword);

      const result = await userService.getCurrentUser(userId);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        omit: { password: true },
      });
      expect(result).toEqual(userWithoutPassword);
    });

    it("throws NotFoundError when user does not exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(userService.getCurrentUser(userId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("updateProfile", () => {
    it("updates only provided fields", async () => {
      const updated = {
        id: userId,
        name: "New Name",
        email: "jane@example.com",
      };
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await userService.updateProfile(userId, {
        name: "New Name",
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: "New Name" },
        omit: { password: true },
      });
      expect(result).toEqual(updated);
    });
  });

  describe("updateAvatar", () => {
    it("enqueues imagekit.delete when old avatar exists", async () => {
      mockFindUnique.mockResolvedValueOnce({ avatarUrl: dbUser.avatarUrl });
      mockUpdate.mockResolvedValueOnce(dbUser);
      mockQueueAdd.mockResolvedValueOnce({ id: "job-1" });

      await userService.updateAvatar(userId, {
        avatarUrl: "https://ik.imagekit.io/new.jpg",
      });

      expect(mockQueueAdd).toHaveBeenCalledWith("imagekit.delete", {
        name: "imagekit.delete",
        data: { fileName: "old-avatar.jpg" },
      });
    });

    it("does not enqueue when no old avatar", async () => {
      mockFindUnique.mockResolvedValueOnce({ avatarUrl: null });
      mockUpdate.mockResolvedValueOnce(dbUser);

      await userService.updateAvatar(userId, {
        avatarUrl: "https://ik.imagekit.io/new.jpg",
      });

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it("does not enqueue when user not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockUpdate.mockResolvedValueOnce(dbUser);

      await userService.updateAvatar(userId, {
        avatarUrl: "https://ik.imagekit.io/new.jpg",
      });

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    const input = {
      currentPassword: "oldpass",
      newPassword: "newpass123",
      confirmNewPassword: "newpass123",
    };

    it("throws NotFoundError when user does not exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(userService.changePassword(userId, input)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws UnauthorizedError when current password is wrong", async () => {
      mockFindUnique.mockResolvedValueOnce(dbUser);
      mockComparePassword.mockResolvedValueOnce(false);

      await expect(userService.changePassword(userId, input)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("hashes and saves new password on success", async () => {
      mockFindUnique.mockResolvedValueOnce(dbUser);
      mockComparePassword.mockResolvedValueOnce(true);
      mockHashPassword.mockResolvedValueOnce("new-hashed");
      mockUpdate.mockResolvedValueOnce({});

      const result = await userService.changePassword(userId, input);

      expect(mockHashPassword).toHaveBeenCalledWith(input.newPassword);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: "new-hashed" },
      });
      expect(result).toEqual({ message: "Password updated successfully" });
    });
  });

  describe("deleteAccount", () => {
    const input = { password: "correctpass" };

    it("throws NotFoundError when user does not exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(userService.deleteAccount(userId, input)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws UnauthorizedError when password is wrong", async () => {
      mockFindUnique.mockResolvedValueOnce(dbUser);
      mockComparePassword.mockResolvedValueOnce(false);

      await expect(userService.deleteAccount(userId, input)).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("enqueues avatar cleanup and deletes user on success", async () => {
      mockFindUnique.mockResolvedValueOnce(dbUser);
      mockComparePassword.mockResolvedValueOnce(true);
      mockQueueAdd.mockResolvedValueOnce({ id: "job-1" });
      mockDelete.mockResolvedValueOnce({});

      const result = await userService.deleteAccount(userId, input);

      expect(mockQueueAdd).toHaveBeenCalledWith("imagekit.delete", {
        name: "imagekit.delete",
        data: { fileName: "old-avatar.jpg" },
      });
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: userId } });
      expect(result).toEqual({ message: "Account deleted successfully" });
    });

    it("skips avatar cleanup when no avatar exists", async () => {
      mockFindUnique.mockResolvedValueOnce({ ...dbUser, avatarUrl: null });
      mockComparePassword.mockResolvedValueOnce(true);
      mockDelete.mockResolvedValueOnce({});

      await userService.deleteAccount(userId, input);

      expect(mockQueueAdd).not.toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
