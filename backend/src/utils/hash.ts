import bcrypt from "bcryptjs";
import { getEnv } from "../lib/env.js";

export const hashPassword = (password: string) => {
  const env = getEnv();

  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
};

export const comparePassword = (password: string, hashPassword: string) => {
  return bcrypt.compare(password, hashPassword);
};
