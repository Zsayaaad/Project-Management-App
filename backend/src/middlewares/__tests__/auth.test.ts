import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { authenticatedUser, requireAdmin } from "../auth.js";
import { verifyToken } from "../../utils/jwt.js";
import { redisClient } from "../../lib/redis.js";
import { getEnv } from "../../lib/env.js";
import {
  UnauthenticatedError,
  UnauthorizedError,
} from "../../errors/customErrors.js";

jest.mock("../../utils/jwt.js", () => ({
  verifyToken: jest.fn(),
}));

jest.mock("../../lib/redis.js", () => ({
  redisClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../lib/env.js", () => ({
  getEnv: jest.fn(),
}));

const mockVerifyToken = verifyToken as unknown as jest.Mock;
const mockRedisGet = redisClient.get as unknown as jest.Mock;
const mockGetEnv = getEnv as unknown as jest.Mock;

const mockReq = (overrides = {}) =>
  ({
    cookies: {},
    ...overrides,
  }) as unknown as Request;

const mockRes = () => ({}) as Response;

const mockNext = jest.fn() as NextFunction;

describe("Auth Middleware", () => {
  const validPayload = {
    userId: "user-1",
    name: "Jane Doe",
    role: Role.MEMBER,
  };

  beforeEach(() => {
    mockGetEnv.mockReturnValue({
      JWT_SECRET: "test-secret",
    });

    mockRedisGet.mockResolvedValue(null);
    mockVerifyToken.mockReturnValue(validPayload);
  });

  describe("authenticatedUser", () => {
    it.each([
      ["token is missing", () => mockReq(), () => {}],
      [
        "token is revoked",
        () => mockReq({ cookies: { token: "revoked-token" } }),
        () => {
          mockRedisGet.mockResolvedValueOnce("1");
        },
      ],
      [
        "token is invalid or expired",
        () => mockReq({ cookies: { token: "invalid-token" } }),
        () => {
          mockRedisGet.mockResolvedValueOnce(null);
          mockVerifyToken.mockImplementationOnce(() => {
            throw new Error("jwt expired");
          });
        },
      ],
    ])(
      "rejects with UnauthenticatedError when %s",
      async (_caseName, buildRequest, arrange) => {
        arrange();

        const req = buildRequest();

        await expect(
          authenticatedUser(req, mockRes(), mockNext),
        ).rejects.toThrow(UnauthenticatedError);

        expect(mockNext).not.toHaveBeenCalled();
      },
    );

    it("attaches user to request and calls next for a valid token", async () => {
      const req = mockReq({
        cookies: { token: "valid-token" },
      });

      await authenticatedUser(req, mockRes(), mockNext);

      expect(mockRedisGet).toHaveBeenCalledWith("revoked_token:valid-token");

      expect(mockVerifyToken).toHaveBeenCalledWith(
        "valid-token",
        "test-secret",
      );

      expect(req.user).toEqual({
        userId: validPayload.userId,
        name: validPayload.name,
        role: validPayload.role,
      });

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("fails open when Redis is unavailable", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockRedisGet.mockRejectedValueOnce(new Error("Redis is down"));

      const req = mockReq({
        cookies: { token: "valid-token" },
      });

      await authenticatedUser(req, mockRes(), mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();

      expect(mockVerifyToken).toHaveBeenCalledWith(
        "valid-token",
        "test-secret",
      );

      expect(req.user).toEqual({
        userId: validPayload.userId,
        name: validPayload.name,
        role: validPayload.role,
      });

      expect(mockNext).toHaveBeenCalledWith();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("requireAdmin", () => {
    it.each<[string, Request]>([
      ["user is missing", mockReq()],
      [
        "user is MEMBER",
        mockReq({
          user: {
            userId: "user-1",
            name: "Jane Doe",
            role: Role.MEMBER,
          },
        }),
      ],
    ])("throws UnauthorizedError when %s", (_caseName, req) => {
      expect(() => requireAdmin(req, mockRes(), mockNext)).toThrow(
        UnauthorizedError,
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it("calls next when user is ADMIN", () => {
      const req = mockReq({
        user: {
          userId: "admin-1",
          name: "Admin",
          role: Role.ADMIN,
        },
      });

      requireAdmin(req, mockRes(), mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
