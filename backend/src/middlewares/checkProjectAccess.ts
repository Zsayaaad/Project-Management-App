import { NextFunction, Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../errors/customErrors.js";
import { prisma } from "../lib/prisma.js";
import { Role } from "@prisma/client";
import { z } from "zod";

const projectIdParamSchema = z.object({
  projectId: z.uuid("Invalid project ID format"),
});

export const extractProjectId = (req: Request): string => {
  const parsed = projectIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw new NotFoundError("Project ID parameter is missing or invalid");
  }

  return parsed.data.projectId;
};

export const checkProjectAccess = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = extractProjectId(req);

    if (!req.user) {
      throw new UnauthorizedError("User is not authenticated");
    }

    const { userId, role } = req.user;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const isMember = project.members.some((member) => member.userId === userId);

    if (role !== Role.ADMIN && !isMember) {
      throw new UnauthorizedError("You do not have access on this operation");
    }

    req.project = project;

    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeProjectCreator = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = extractProjectId(req);

    if (!req.user) {
      throw new UnauthorizedError("User is not authenticated");
    }
    const { userId, role } = req.user;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        creatorId: true,
      },
    });

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const isCreator = project.creatorId === userId;

    if (role !== Role.ADMIN && !isCreator) {
      throw new UnauthorizedError(
        "Only the project creator or admin can perform this action",
      );
    }

    req.project = project;

    next();
  } catch (error) {
    next(error);
  }
};
