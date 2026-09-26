import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../utils/jwt.js";
import {
  UnauthenticatedError,
  UnauthorizedError,
} from "../errors/customErrors.js";
import { isAdmin } from "../lib/roles.js";
import { redisClient } from "../lib/redis.js";
import { getEnv } from "../lib/env.js";

export interface AuthenticatedUserPayload {
  userId: string;
  name: string;
  role: Role;
  exp?: number;
}

export const authenticatedUser = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { token } = req.cookies;

  if (!token) {
    throw new UnauthenticatedError("Authentication token is missing");
  }

  const env = getEnv();

  // If Redis is down, we log the error but let the request through so the app doesn't completely break.
  // 1. Check if token is revoked in Redis
  try {
    const isRevoked = await redisClient.get(`revoked_token:${token}`);
    if (isRevoked) {
      throw new UnauthenticatedError("Token has been revoked");
    }
  } catch (redisError) {
    // Fail open: If Redis is down, log it but allow the request to proceed
    // CRITICAL FIX: Rethrow our own errors so they aren't swallowed by the Redis fail-open logic
    if (redisError instanceof UnauthenticatedError) throw redisError;
    console.error("Redis error during auth check:", redisError);
  }

  // 2. Verify JWT
  try {
    const payload = verifyToken(
      token,
      env.JWT_SECRET,
    ) as AuthenticatedUserPayload;

    req.user = {
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
    };

    next();
  } catch (error) {
    throw new UnauthenticatedError("Invalid or expired token");
  }
};

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.user || !isAdmin(req.user.role)) {
    throw new UnauthorizedError("Admin access required");
  }
  next();
};
