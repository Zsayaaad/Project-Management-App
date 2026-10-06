import { Request, Response, NextFunction } from "express";
import { authenticatedUser, requireAdmin } from "../auth.js";
import { UnauthorizedError } from "../../errors/customErrors.js";
import { Role } from "@prisma/client";

jest.mock("../../lib/redis.js", () => ({
  redisClient: { get: jest.fn() },
}));

jest.mock("../../utils/jwt.js", () => ({
  verifyToken: jest.fn(),
}));

jest.mock("../../lib/env.js", () => ({
  getEnv: jest.fn(() => ({ JWT_SECRET: "test-secret" })),
}));

import { redisClient } from "../../lib/redis.js";
import { verifyToken } from "../../utils/jwt.js";

describe("Auth Middlewares", () => {
  const mockRes = {} as Response;
  const mockNext: NextFunction = jest.fn();

  const mockReq = (overrides: Partial<Request> = {}) =>
    ({ cookies: {}, ...overrides }) as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("authenticatedUser", () => {
    it("throws UnauthenticatedError if token cookie is missing", async () => {
      const req = mockReq({ cookies: {} });
      await expect(authenticatedUser(req, mockRes, mockNext)).rejects.toThrow(
        "Authentication token is missing",
      );
    });

    it("throws UnauthenticatedError if token is revoked in Redis", async () => {
      const req = mockReq({ cookies: { token: "revoked-token" } });
      jest.mocked(redisClient.get).mockResolvedValue("1");

      await expect(authenticatedUser(req, mockRes, mockNext)).rejects.toThrow(
        "Token has been revoked",
      );
    });

    it("fails open and verifies JWT if Redis throws a network error", async () => {
      const req = mockReq({ cookies: { token: "valid-token" } });
      jest.mocked(redisClient.get).mockRejectedValue(new Error("Redis down"));
      jest.mocked(verifyToken).mockReturnValue({
        userId: "user-1",
        role: Role.MEMBER,
        name: "Test User",
      } as any);

      await authenticatedUser(req, mockRes, mockNext);

      expect(verifyToken).toHaveBeenCalledWith("valid-token", "test-secret");
      expect(req.user).toEqual({
        userId: "user-1",
        role: Role.MEMBER,
        name: "Test User",
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("throws UnauthenticatedError if JWT verification fails", async () => {
      const req = mockReq({ cookies: { token: "invalid-token" } });
      jest.mocked(redisClient.get).mockResolvedValue(null);
      jest.mocked(verifyToken).mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(authenticatedUser(req, mockRes, mockNext)).rejects.toThrow(
        "Invalid or expired token",
      );
    });

    it("attaches user to req and calls next on valid token", async () => {
      const req = mockReq({ cookies: { token: "valid-token" } });
      jest.mocked(redisClient.get).mockResolvedValue(null);
      jest.mocked(verifyToken).mockReturnValue({
        userId: "user-1",
        role: Role.ADMIN,
        name: "Admin User",
      } as any);

      await authenticatedUser(req, mockRes, mockNext);

      expect(req.user).toEqual({
        userId: "user-1",
        role: Role.ADMIN,
        name: "Admin User",
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("throws UnauthorizedError if req.user is missing", () => {
      const req = mockReq();
      expect(() => requireAdmin(req, mockRes, mockNext)).toThrow(
        UnauthorizedError,
      );
    });

    it("throws UnauthorizedError if user is not ADMIN", () => {
      const req = mockReq({
        user: { userId: "1", role: Role.MEMBER, name: "User" },
      });
      expect(() => requireAdmin(req, mockRes, mockNext)).toThrow(
        "Admin access required",
      );
    });

    it("calls next if user is ADMIN", () => {
      const req = mockReq({
        user: { userId: "1", role: Role.ADMIN, name: "Admin" },
      });
      requireAdmin(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
