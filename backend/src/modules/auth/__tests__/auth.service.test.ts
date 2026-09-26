import {
  ConflictError,
  UnauthenticatedError,
} from "../../../errors/customErrors.js";
import { getEnv } from "../../../lib/env.js";
import { prisma } from "../../../lib/prisma.js";
import { redisClient } from "../../../lib/redis.js";
import { comparePassword, hashPassword } from "../../../utils/hash.js";
import { generateToken, verifyToken } from "../../../utils/jwt.js";
import { authService } from "../auth.service.js";

jest.mock("../../../lib/prisma.js", () => ({
  prisma: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));

jest.mock("../../../utils/hash.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock("../../../utils/jwt.js", () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock("../../../lib/env.js", () => ({
  getEnv: jest.fn(),
}));

jest.mock("../../../lib/redis.js", () => ({ redisClient: { set: jest.fn() } }));

const mockFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockCreate = prisma.user.create as unknown as jest.Mock;
const mockHashPassword = hashPassword as unknown as jest.Mock;
const mockComparePassword = comparePassword as unknown as jest.Mock;
const mockGenerateToken = generateToken as unknown as jest.Mock;
const mockVerifyToken = verifyToken as unknown as jest.Mock;
const mockGetEnv = getEnv as unknown as jest.Mock;
const mockRedisSet = redisClient.set as unknown as jest.Mock;

describe("Auth Service", () => {
  // beforeEach(() => jest.clearAllMocks());
  beforeEach(() => {
    mockGetEnv.mockReturnValue({
      NODE_ENV: "test",
      JWT_SECRET: "test-secret",
      JWT_EXPIRES_IN: "7d",
    });
  });

  describe("register", () => {
    const registerInput = {
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "MEMBER",
    };

    const createdUser = {
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "MEMBER",
    };

    it("should throw ConflictError if email already exists", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "existing-user" });

      // await expect(authService.register(registerInput)).rejects.toThrow(
      //   ConflictError,
      // );

      // await expect(authService.register(registerInput)).rejects.toThrow(
      //   "Email already exists",
      // );

      const promise = authService.register(registerInput);

      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toThrow("Email already exists");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          email: registerInput.email,
        },
      });
    });

    it("should hash password, create user, and return user with token", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockHashPassword.mockResolvedValueOnce("hashed-password");
      mockCreate.mockResolvedValueOnce(createdUser);
      mockGenerateToken.mockReturnValueOnce("jwt-token");

      const result = await authService.register(registerInput);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          email: registerInput.email,
        },
      });

      expect(mockHashPassword).toHaveBeenCalledWith(registerInput.password);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: registerInput.fullName,
          email: registerInput.email,
          password: "hashed-password",
          role: "MEMBER",
        },
        omit: {
          password: true,
        },
      });

      expect(mockGenerateToken).toHaveBeenCalledWith(
        {
          userId: createdUser.id,
          name: createdUser.name,
          role: createdUser.role,
        },
        "test-secret",
        "7d",
      );

      expect(result).toEqual({
        user: createdUser,
        token: "jwt-token",
      });
    });
  });

  describe("login", () => {
    const loginInput = {
      email: "jane@example.com",
      password: "password123",
    };

    const dbUser = {
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "MEMBER",
      password: "hashed-password",
    };

    it("should throw UnauthenticatedError if user does not exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      // await expect(authService.login(loginInput)).rejects.toThrow(
      //   UnauthenticatedError,
      // );

      // await expect(authService.login(loginInput)).rejects.toThrow(
      //   "Invalid email or password",
      // );

      const promise = authService.login(loginInput);

      await expect(promise).rejects.toThrow(UnauthenticatedError);
      await expect(promise).rejects.toThrow("Invalid email or password");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          email: loginInput.email,
        },
      });
    });

    it("should throw UnauthenticatedError if password is invalid", async () => {
      mockFindUnique.mockResolvedValueOnce(dbUser);
      mockComparePassword.mockResolvedValueOnce(false);

      await expect(authService.login(loginInput)).rejects.toThrow(
        UnauthenticatedError,
      );

      await expect(authService.login(loginInput)).rejects.toThrow(
        "Invalid email or password",
      );

      expect(mockComparePassword).toHaveBeenCalledWith(
        loginInput.password,
        dbUser.password,
      );
    });

    it("should return sanitized user and token when credentials are valid", async () => {
      mockFindUnique.mockResolvedValueOnce(dbUser);
      mockComparePassword.mockResolvedValueOnce(true);
      mockGenerateToken.mockReturnValueOnce("jwt-token");

      const result = await authService.login(loginInput);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          email: loginInput.email,
        },
      });

      expect(mockComparePassword).toHaveBeenCalledWith(
        loginInput.password,
        dbUser.password,
      );

      expect(mockGenerateToken).toHaveBeenCalledWith(
        {
          userId: dbUser.id,
          name: dbUser.name,
          role: dbUser.role,
        },
        "test-secret",
        "7d",
      );

      expect(result).toEqual({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        },
        token: "jwt-token",
      });

      expect(result.user).not.toHaveProperty("password");
    });
  });

  describe("revokeToken", () => {
    const fixedNowInMs = 1_700_000_000_000;
    const fixedNowInSeconds = Math.floor(fixedNowInMs / 1000);

    let consoleErrorSpy: jest.SpyInstance<void, any[]>;
    let dateNowSpy: jest.SpyInstance<number, []>;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedNowInMs);
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      dateNowSpy.mockRestore();
    });

    it("should blacklist a valid token in Redis with the remaining TTL", async () => {
      const token = "valid-token";
      const expirationInSeconds = fixedNowInSeconds + 3600;

      mockVerifyToken.mockReturnValueOnce({
        exp: expirationInSeconds,
      });

      mockRedisSet.mockResolvedValueOnce("OK");

      await authService.revokeToken(token);

      expect(mockVerifyToken).toHaveBeenCalledWith(token, "test-secret");

      expect(mockRedisSet).toHaveBeenCalledWith(
        `revoked_token:${token}`,
        "1",
        "EX",
        3600,
      );

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not blacklist a token that is already expired", async () => {
      const token = "expired-token";
      const expirationInSeconds = fixedNowInSeconds - 10;

      mockVerifyToken.mockReturnValueOnce({
        exp: expirationInSeconds,
      });

      await authService.revokeToken(token);

      expect(mockVerifyToken).toHaveBeenCalledWith(token, "test-secret");
      expect(mockRedisSet).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not blacklist a token that expires exactly now", async () => {
      const token = "expires-now-token";

      mockVerifyToken.mockReturnValueOnce({
        exp: fixedNowInSeconds,
      });

      await authService.revokeToken(token);

      expect(mockVerifyToken).toHaveBeenCalledWith(token, "test-secret");
      expect(mockRedisSet).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not blacklist a token when payload does not contain exp", async () => {
      const token = "token-without-exp";

      mockVerifyToken.mockReturnValueOnce({});

      await authService.revokeToken(token);

      expect(mockVerifyToken).toHaveBeenCalledWith(token, "test-secret");
      expect(mockRedisSet).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not throw when token verification fails", async () => {
      const token = "invalid-token";

      mockVerifyToken.mockImplementationOnce(() => {
        throw new Error("invalid token");
      });

      await expect(authService.revokeToken(token)).resolves.toBeUndefined();

      expect(mockVerifyToken).toHaveBeenCalledWith(token, "test-secret");
      expect(mockRedisSet).not.toHaveBeenCalled();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error blacklisting token:",
        expect.any(Error),
      );
    });

    it("should not throw when Redis is unavailable", async () => {
      const token = "valid-token";
      const expirationInSeconds = fixedNowInSeconds + 3600;

      mockVerifyToken.mockReturnValueOnce({
        exp: expirationInSeconds,
      });

      mockRedisSet.mockRejectedValueOnce(new Error("Redis is down"));

      await expect(authService.revokeToken(token)).resolves.toBeUndefined();

      expect(mockVerifyToken).toHaveBeenCalledWith(token, "test-secret");

      expect(mockRedisSet).toHaveBeenCalledWith(
        `revoked_token:${token}`,
        "1",
        "EX",
        3600,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error blacklisting token:",
        expect.any(Error),
      );
    });
  });
});
