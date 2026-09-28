import { Prisma, Role } from "@prisma/client";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../errors/customErrors.js";
import { prisma } from "../../lib/prisma.js";
import {
  AddMemberInput,
  CreateProjectInput,
  GetAllProjectsQueryInput,
  UpdateProjectInput,
} from "./projects.schema.js";
import { streamClient } from "../../lib/stream.js";
import { syncQueue } from "../../lib/queues.js";

export const getProjectChannel = (projectId: string) =>
  streamClient.channel("messaging", `project-${projectId}`);

export const createProject = async (
  creatorId: string,
  data: CreateProjectInput,
) => {
  //#region
  // THIS approach has two issues:
  // 1- Race condition — the findFirst check is outside the transaction, so two requests could both pass the check before either creates the project
  // 2- Unnecessary fetch — you're doing a third query after the transaction
  // const existingProject = await prisma.project.findFirst({
  //     where: {
  //       name: data.name,
  //     },
  //   });
  //   if (existingProject) {
  //     throw new ConflictError("You already have a project with this name");
  //   }
  //#endregion
  try {
    // Single transaction: create project + member + return with relations
    // $transaction = atomic writes (all succeed or all rollback)
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: data.name,
          description: data.description!,
          creatorId,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true, role: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      });

      await tx.projectMember.create({
        data: {
          userId: creatorId,
          projectId: newProject.id,
        },
      });

      return newProject;
    });

    //#region Old code reference
    // try {
    //   // Make sure the creator exists in Stream's user storage
    //   await streamClient.upsertUsers([
    //     {
    //       id: creatorId,
    //       name: project.creator.name,
    //       role: project.creator.role === "ADMIN" ? "admin" : "user",
    //     },
    //   ]);

    //   // Create the channel tied to this project
    //   const channel = streamClient.channel(
    //     "messaging",
    //     `project-${project.id}`,
    //     {
    //       name: project.name,
    //       created_by_id: creatorId,
    //       members: [creatorId],
    //     },
    //   );
    //   await channel.create();
    // } catch (streamError) {
    //   // DB is the source of truth — never fail the request because of Stream
    //   console.error(
    //     `Stream: failed to create channel for project ${project.id}`,
    //     streamError,
    //   );
    // }
    //#endregion

    // ---- QUEUE: create the project's chat channel ----
    await syncQueue.add(
      "stream.channel.create",
      {
        name: "stream.channel.create",
        data: {
          projectId: project.id,
          projectName: project.name,
          creatorId,
          creatorName: project.creator.name,
          creatorRole: project.creator.role,
        },
      },
      { jobId: `channel-create-${project.id}` },
    );

    return project;
  } catch (error) {
    // CLEANUP: Type-safe Prisma error handling
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("You already have a project with this name");
    }

    throw error;
  }
};

export const getAllProjects = async (
  userId: string,
  role: Role,
  query: GetAllProjectsQueryInput,
) => {
  const { search, limit, page, sort } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {
    ...(role !== Role.ADMIN && { members: { some: { userId: userId } } }),
    ...(search && { name: { contains: search, mode: "insensitive" } }),
  };

  const sortOptions: Record<string, Prisma.ProjectOrderByWithRelationInput> = {
    "a-z": { name: "asc" },
    "z-a": { name: "desc" },
    newest: { createdAt: "desc" },
    oldest: { createdAt: "asc" },
  };

  const orderBy = sortOptions[sort!] || { createdAt: "desc" };

  const [totalProjects, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    }),
  ]);

  return {
    projects,
    pagination: {
      totalProjects,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
      limit,
    },
  };
};

export const getProjectById = async (projectId: string) => {
  const product = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      tasks: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return product;
};

export const updateProject = async (
  projectId: string,
  data: UpdateProjectInput,
) => {
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data,
  });

  // ---- STREAM SYNC: keep the channel name in sync with the project name ----
  if (data.name) {
    // try {
    //   await getProjectChannel(projectId).update({ name: data.name });
    // } catch (streamError) {
    //   console.error(
    //     `Stream: failed to rename channel for project ${projectId}`,
    //     streamError,
    //   );
    // }

    await syncQueue.add("stream.channel.update", {
      name: "stream.channel.update",
      data: { projectId, name: data.name },
    });
  }

  return updatedProject;
};

export const deleteProject = async (projectId: string) => {
  await prisma.project.delete({
    where: { id: projectId },
  });

  // // ---- STREAM SYNC: delete the channel + its message history ----
  // try {
  //   await getProjectChannel(projectId).delete();
  // } catch (streamError) {
  //   console.error(
  //     `Stream: failed to delete channel for project ${projectId}`,
  //     streamError,
  //   );
  // }

  await syncQueue.add(
    "stream.channel.delete",
    {
      name: "stream.channel.delete",
      data: { projectId },
    },
    { jobId: `channel-delete-${projectId}` },
  );

  return { message: "Project deleted successfully" };
};

export const getProjectMembers = async (projectId: string) => {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  return members.map((m) => m.user);
};

export const addMember = async (
  projectId: string,
  data: AddMemberInput,
  addedById: string,
) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId: user.id, projectId },
    },
  });

  if (existingMember) {
    throw new ConflictError("User is already a member of this project");
  }

  await prisma.projectMember.create({
    data: { userId: user.id, projectId },
  });

  // // ---- STREAM SYNC: give the new member access to the project chat ----
  // try {
  //   // Ensure the user exists in Stream's user storage
  //   await streamClient.upsertUsers([
  //     {
  //       id: user.id,
  //       name: user.name,
  //       role: user.role === "ADMIN" ? "admin" : "user",
  //     },
  //   ]);

  //   // Add them to the project's channel
  //   const channel = getProjectChannel(projectId);
  //   await channel.addMembers([user.id]);

  //   // Announce it in the chat (silent = no push/unread noise)
  //   await channel.sendMessage({
  //     text: `${user.name} was added to the project.`,
  //     user_id: addedById,
  //     silent: true,
  //   });
  // } catch (streamError) {
  //   console.error(
  //     `Stream: failed to sync new member for project ${projectId}`,
  //     streamError,
  //   );
  // }

  await syncQueue.add("stream.member.add", {
    name: "stream.member.add",
    data: {
      projectId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      addedById,
    },
  });

  return user;
};

export async function removeMember(
  projectId: string,
  userId: string,
  requesterId: string,
) {
  // Admin
  if (userId === requesterId) {
    throw new BadRequestError("You cannot remove yourself from the project");
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
    include: {
      user: {
        select: {
          name: true, // This fetches the user relation but only grabs the 'name' field
        },
      },
    },
  });

  if (!membership) {
    throw new NotFoundError("User is not a member of this project");
  }

  await prisma.projectMember.delete({
    where: {
      userId_projectId: { userId, projectId },
    },
  });

  // // ---- STREAM SYNC: revoke chat access ----
  // try {
  //   const channel = getProjectChannel(projectId);
  //   await channel.removeMembers([userId]);

  //   await channel.sendMessage({
  //     text: `${membership.user.name} was removed from the project`,
  //     user_id: requesterId, // Recommended: specify who triggered the system message
  //     silent: true, // Optional: prevent push notifications for system messages
  //   });
  // } catch (streamError) {
  //   console.error(
  //     `Stream: failed to sync member removal for project ${projectId}`,
  //     streamError,
  //   );
  // }

  await syncQueue.add("stream.member.remove", {
    name: "stream.member.remove",
    data: {
      projectId,
      userId,
      userName: membership.user.name,
      requesterId,
    },
  });
}

export const projectService = {
  getProjectChannel,
  createProject,
  getAllProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};
