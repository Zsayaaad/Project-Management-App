import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";
import {
  authorizeProjectCreator,
  checkProjectAccess,
  extractProjectId,
} from "../checkProjectAccess.js";
import { NotFoundError, UnauthorizedError } from "../../errors/customErrors.js";
import { Role } from "@prisma/client";

jest.mock("../../lib/prisma.js", () => ({
  prisma: { project: { findUnique: jest.fn() } },
}));

const mockFindUnique = prisma.project.findUnique as unknown as jest.Mock;

const mockReq = (overrides = {}) =>
  ({ params: {}, user: undefined, ...overrides }) as unknown as Request;

const mockRes = () => ({}) as Response;
const mockNext = jest.fn() as NextFunction;

describe("Project Access Middlewares", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("extractProjectId", () => {
    it("returns valid UUID", () => {
      const req = mockReq({
        params: { projectId: "123e4567-e89b-12d3-a456-426614174000" },
      });
      expect(extractProjectId(req)).toBe(
        "123e4567-e89b-12d3-a456-426614174000",
      );
    });

    it.each([
      ["invalid UUID", { projectId: "not-a-uuid" }],
      ["missing param", {}],
    ])("throws NotFoundError for %s", (_case, params) => {
      const req = mockReq({ params });
      expect(() => extractProjectId(req)).toThrow(NotFoundError);
    });
  });

  describe("checkProjectAccess", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const project = {
      id: validUuid,
      creatorId: "user-1",
      members: [{ userId: "user-2" }],
    };

    it("calls next with UnauthorizedError if user is not authenticated", async () => {
      const req = mockReq({ params: { projectId: validUuid } });

      await checkProjectAccess(req, mockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("calls next with NotFoundError if project does not exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      const req = mockReq({
        params: { projectId: validUuid },
        user: { userId: "user-2", role: Role.MEMBER },
      });

      await checkProjectAccess(req, mockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it("attaches project and calls next if user is a member", async () => {
      mockFindUnique.mockResolvedValueOnce(project);
      const req = mockReq({
        params: { projectId: validUuid },
        user: { userId: "user-2", role: Role.MEMBER },
      });

      await checkProjectAccess(req, mockRes(), mockNext);

      expect(req.project).toEqual(project);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("attaches project and calls next if user is Admin", async () => {
      mockFindUnique.mockResolvedValueOnce(project);
      const req = mockReq({
        params: { projectId: validUuid },
        user: { userId: "admin-1", role: Role.ADMIN },
      });

      await checkProjectAccess(req, mockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("calls next with UnauthorizedError if user is neither member nor admin", async () => {
      mockFindUnique.mockResolvedValueOnce(project);
      const req = mockReq({
        params: { projectId: validUuid },
        user: { userId: "user-3", role: Role.MEMBER },
      });

      await checkProjectAccess(req, mockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe("authorizeProjectCreator", () => {
    const project = { id: "1", creatorId: "user-1" };

    it("calls next if user is the creator", () => {
      const req = mockReq({
        project,
        user: { userId: "user-1", role: Role.MEMBER },
      });
      authorizeProjectCreator(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("calls next if user is Admin", () => {
      const req = mockReq({
        project,
        user: { userId: "admin-1", role: Role.ADMIN },
      });
      authorizeProjectCreator(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("calls next with UnauthorizedError if user is neither creator nor admin", async () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";
      mockFindUnique.mockResolvedValueOnce({
        id: validUuid,
        creatorId: "user-1",
      });

      const req = mockReq({
        params: { projectId: validUuid },
        user: { userId: "user-2", role: Role.MEMBER },
      });

      await authorizeProjectCreator(req, mockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });
});
