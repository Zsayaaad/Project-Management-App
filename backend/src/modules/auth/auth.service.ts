import {
  ConflictError,
  UnauthenticatedError,
} from "../../errors/customErrors.js";
import { prisma } from "../../lib/prisma.js";
import { parseRole } from "../../lib/roles.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { LoginInput, RegisterInput } from "./auth.schema.js";
import { generateToken, verifyToken } from "../../utils/jwt.js";
import { getEnv } from "../../lib/env.js";
import { redisClient } from "../../lib/redis.js";

export const register = async (data: RegisterInput) => {
  const env = getEnv();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new ConflictError("Email already exists");
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.fullName,
      email: data.email,
      password: hashedPassword,
      role: parseRole(data.role),
    },
    omit: {
      password: true,
    },
  });

  const token = generateToken(
    {
      userId: user.id,
      name: user.name,
      role: user.role,
    },
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN,
  );

  return { user, token };
};

export const login = async (data: LoginInput) => {
  const env = getEnv();

  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(data.password, user.password);

  if (!isPasswordValid) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const token = generateToken(
    {
      userId: user.id,
      name: user.name,
      role: user.role,
    },
    env.JWT_SECRET,
    env.JWT_EXPIRES_IN,
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
};

export const revokeToken = async (token: string) => {
  const env = getEnv();

  // If the token is already invalid/expired, there's nothing to blacklist
  try {
    const payload = verifyToken(token, env.JWT_SECRET) as { exp: number };
    if (payload && payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      // store it in Redis with a matching Time-To-Live (TTL)
      const ttl = payload.exp - now;

      // Only store if it hasn't already expired
      if (ttl > 0) {
        await redisClient.set(`revoked_token:${token}`, "1", "EX", ttl);
      }
    }
  } catch (error) {
    // If token is already invalid/expired, no need to blacklist it
    console.error("Error blacklisting token:", error);
  }
};

export const authService = {
  register,
  login,
  revokeToken,
};
