import { Request, Response, NextFunction } from "express";
import {
  extractProjectId,
  checkProjectAccess,
  authorizeProjectCreator,
} from "../checkProjectAccess.js";
import { NotFoundError, UnauthorizedError } from "../../errors/customErrors.js";
import { Role } from "@prisma/client";

jest.mock("../../lib/prisma.js", () => ({
  prisma: {
    project: { findUnique: jest.fn() },
  },
}));

import { prisma } from "../../lib/prisma.js";

describe("Project Access Middlewares", () => {
  const mockRes = {} as Response;
  const mockNext: NextFunction = jest.fn();

  const mockReq = (overrides: Partial<Request> = {}) =>
    ({ params: {}, user: undefined, ...overrides }) as Request;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractProjectId", () => {
    it("returns valid UUID", () => {
      const req = mockReq({
        params: { projectId: "123e4567-e89b-12d3-a456-426614174000" },
      });
      expect(extractProjectId(req)).toBe(
        "123e4567-e89b-12d3-a456-426614174000",
      );
    });

    it("throws NotFoundError for invalid UUID", () => {
      const req = mockReq({ params: { projectId: "not-a-uuid" } });
      expect(() => extractProjectId(req)).toThrow(NotFoundError);
    });
  });

  describe("checkProjectAccess", () => {
    const validId = "123e4567-e89b-12d3-a456-426614174000";

    it("calls next with NotFoundError for invalid UUID", async () => {
      const req = mockReq({
        params: { projectId: "bad-id" },
        user: { userId: "u1", role: Role.MEMBER, name: "U" },
      });
      await checkProjectAccess(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it("calls next with UnauthorizedError if user is not authenticated", async () => {
      const req = mockReq({ params: { projectId: validId } });
      await checkProjectAccess(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next with NotFoundError if project does not exist", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.MEMBER, name: "U" },
      });
      jest.mocked(prisma.project.findUnique).mockResolvedValue(null as any);

      await checkProjectAccess(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it("calls next with UnauthorizedError if user is non-member and non-admin", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.MEMBER, name: "U" },
      });
      jest.mocked(prisma.project.findUnique).mockResolvedValue({
        id: validId,
        members: [{ userId: "u2", projectId: validId }],
      } as any);

      await checkProjectAccess(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("attaches project and calls next for project member", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.MEMBER, name: "U" },
      });
      const mockProject = {
        id: validId,
        members: [{ userId: "u1", projectId: validId }],
      };
      jest
        .mocked(prisma.project.findUnique)
        .mockResolvedValue(mockProject as any);

      await checkProjectAccess(req, mockRes, mockNext);
      expect(req.project).toEqual(mockProject);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("attaches project and calls next for admin (even if not member)", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.ADMIN, name: "A" },
      });
      const mockProject = { id: validId, members: [] };
      jest
        .mocked(prisma.project.findUnique)
        .mockResolvedValue(mockProject as any);

      await checkProjectAccess(req, mockRes, mockNext);
      expect(req.project).toEqual(mockProject);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("authorizeProjectCreator", () => {
    const validId = "123e4567-e89b-12d3-a456-426614174000";

    it("calls next with UnauthorizedError if user is not creator and not admin", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.MEMBER, name: "U" },
      });
      jest.mocked(prisma.project.findUnique).mockResolvedValue({
        id: validId,
        creatorId: "u2",
      } as any);

      await authorizeProjectCreator(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next for project creator", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.MEMBER, name: "U" },
      });
      jest.mocked(prisma.project.findUnique).mockResolvedValue({
        id: validId,
        creatorId: "u1",
      } as any);

      await authorizeProjectCreator(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("calls next for admin", async () => {
      const req = mockReq({
        params: { projectId: validId },
        user: { userId: "u1", role: Role.ADMIN, name: "A" },
      });
      jest.mocked(prisma.project.findUnique).mockResolvedValue({
        id: validId,
        creatorId: "u2",
      } as any);

      await authorizeProjectCreator(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
