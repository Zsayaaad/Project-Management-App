import {
  ConflictError,
  UnauthenticatedError,
} from "../../../errors/customErrors.js";
import { prisma } from "../../../lib/prisma.js";
import { redisClient } from "../../../lib/redis.js";
import { getEnv } from "../../../lib/env.js";
import { generateToken } from "../../../utils/jwt.js";
import { comparePassword } from "../../../utils/hash.js";
import { createUser } from "../../../test/factories.js";
import { login, register, revokeToken } from "../auth.service.js";

describe("Auth Service (Integration)", () => {
  describe("register", () => {
    it("throws ConflictError when email already exists", async () => {
      await createUser({ email: "taken@test.com" });

      const promise = register({
        fullName: "New User",
        email: "taken@test.com",
        password: "password123",
      });

      await expect(promise).rejects.toThrow(ConflictError);
      await expect(promise).rejects.toThrow("Email already exists");
    });

    it("creates user with hashed password and returns token without password", async () => {
      const result = await register({
        fullName: "Jane Doe",
        email: "jane@test.com",
        password: "securePass123",
      });

      // Assert user was created
      expect(result.user.name).toBe("Jane Doe");
      expect(result.user.email).toBe("jane@test.com");
      expect(result.user.id).toBeDefined();

      // Assert password hash is NOT exposed
      expect(result.user).not.toHaveProperty("password");

      // Assert token is returned
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");

      // Verify password was actually hashed in the DB
      const dbUser = await prisma.user.findUnique({
        where: { email: "jane@test.com" },
      });
      expect(dbUser!.password).not.toBe("securePass123");
      expect(await comparePassword("securePass123", dbUser!.password)).toBe(
        true,
      );
    });
  });

  describe("login", () => {
    it.each([
      ["unknown email", "nonexistent@test.com", "password123"],
      ["wrong password", "PLACEHOLDER", "wrongPassword123"],
    ])(
      "throws UnauthenticatedError with same generic message for %s",
      async (_case, email, password) => {
        const user = await createUser({ password: "password123" });

        const loginEmail = email === "PLACEHOLDER" ? user.email : email;

        const promise = login({ email: loginEmail, password });

        await expect(promise).rejects.toThrow(UnauthenticatedError);
        await expect(promise).rejects.toThrow("Invalid email or password");
      },
    );

    it("returns token and user info without password for valid credentials", async () => {
      const user = await createUser({ password: "myPassword123" });

      const result = await login({
        email: user.email,
        password: "myPassword123",
      });

      // Assert user info is returned
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
      expect(result.user.name).toBe(user.name);
      expect(result.user.role).toBe(user.role);

      // Assert password is NOT exposed
      expect(result.user).not.toHaveProperty("password");

      // Assert token is returned
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe("string");
    });
  });

  describe("revokeToken", () => {
    it("stores revoked token in Redis with TTL > 0 and <= remaining lifetime", async () => {
      const env = getEnv();

      // Generate a real token with the test secret
      const token = generateToken(
        { userId: "user-1", name: "Test", role: "MEMBER" },
        env.JWT_SECRET,
        env.JWT_EXPIRES_IN,
      );

      await revokeToken(token);

      // Verify the key exists in Redis
      const value = await redisClient.get(`revoked_token:${token}`);
      expect(value).toBe("1");

      // Verify TTL is positive and <= the token's remaining lifetime
      const ttl = await redisClient.ttl(`revoked_token:${token}`);
      expect(ttl).toBeGreaterThan(0);

      // JWT_EXPIRES_IN in .env.test is "1h" = 3600 seconds
      const maxTtlSeconds = 3600;
      expect(ttl).toBeLessThanOrEqual(maxTtlSeconds);
    });
  });
});
