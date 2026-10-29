import { NotFoundError, UnauthorizedError } from "../../errors/customErrors.js";
import { prisma } from "../../lib/prisma.js";
import { syncQueue } from "../../lib/queues.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import {
  ChangePasswordInput,
  DeleteAccountInput,
  UpdateAvatarInput,
  UpdateProfileInput,
} from "./user.schema.js";

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    omit: {
      password: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user;
};

export const updateProfile = async (
  userId: string,
  data: UpdateProfileInput,
) => {
  const newUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(data.name && {
        name: data.name,
      }),
      ...(data.email && {
        email: data.email,
      }),
    },
    omit: {
      password: true,
    },
  });

  return newUser;
};

export const updateAvatar = async (userId: string, data: UpdateAvatarInput) => {
  // Fetch current user to get old avatar URL
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });

  // Delete old avatar from ImageKit if it exists
  if (currentUser?.avatarUrl) {
    // try {
    //   // Extract file ID from URL (ImageKit URLs contain the file ID)
    //   // Format: https://ik.imagekit.io/your_id/task-management/avatars/filename.jpg
    //   const urlParts = currentUser.avatarUrl.split("/");
    //   const fileName = urlParts[urlParts.length - 1];
    //   const filePath = `task-management/avatars/${fileName}`;

    //   await imagekit.deleteFile(filePath);
    // } catch (error) {
    //   // Log but don't fail if delete fails (file might already be gone)
    //   console.error("Failed to delete old avatar:", error);
    // }

    // Extract file path from URL
    const urlParts = currentUser.avatarUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    // const filePath = `task-management/avatars/${fileName}`;

    await syncQueue.add("imagekit.delete", {
      name: "imagekit.delete",
      data: { fileName },
    });
  }

  // Update user with new avatar URL
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: data.avatarUrl },
    omit: { password: true },
  });

  return updatedUser;
};

export const changePassword = async (
  userId: string,
  data: ChangePasswordInput,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isCurrentPasswordValid = await comparePassword(
    data.currentPassword,
    user!.password,
  );

  if (!isCurrentPasswordValid) {
    throw new UnauthorizedError("current password is incorrect");
  }

  const hashedPassword = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: "Password updated successfully",
  };
};

export const deleteAccount = async (
  userId: string,
  data: DeleteAccountInput,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      // id: true,
      password: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isPasswordValid = await comparePassword(data.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Password is incorrect");
  }

  // Delete avatar from ImageKit before deleting account
  if (user.avatarUrl) {
    // try {
    //   // Extract file ID from URL (ImageKit URLs contain the file ID)
    //   const urlParts = user.avatarUrl.split("/");
    //   const fileName = urlParts[urlParts.length - 1];
    //   const filePath = `task-management/avatars/${fileName}`;

    //   await imagekit.deleteFile(filePath);
    // } catch (error) {
    //   console.error("Failed to delete avatar on account deletion:", error);
    // }

    // Extract file path from URL
    const urlParts = user.avatarUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    // const filePath = `task-management/avatars/${fileName}`;

    await syncQueue.add("imagekit.delete", {
      name: "imagekit.delete",
      data: { fileName },
    });
  }

  await prisma.$transaction(async (tx) => {
    // Delete projects owned by the user (cascades to their tasks and members)
    await tx.project.deleteMany({
      where: {
        creatorId: userId,
      },
    });

    // Delete any remaining tasks created by or assigned to the user in other projects
    await tx.task.deleteMany({
      where: {
        OR: [{ creatorId: userId }, { assigneeId: userId }],
      },
    });

    await tx.user.delete({
      where: {
        id: userId,
      },
    });
  });

  return {
    message: "Account deleted successfully",
  };
};

export const userService = {
  getCurrentUser,
  updateProfile,
  updateAvatar,
  changePassword,
  deleteAccount,
};
