import { ConflictError, UnauthorizedError } from "../../errors/customErrors.js";
import { prisma } from "../../lib/prisma.js";
import { parseRole } from "../../lib/roles.js";
import { comparePassword, hashPassword } from "../../utils/hash.js";
import { LoginInput, RegisterInput } from "./auth.schema.js";
import { generateToken } from "../../utils/jwt.js";
import { getEnv } from "../../lib/env.js";

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
    throw new UnauthorizedError("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(data.password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
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

export const authService = {
  register,
  login,
};
