import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "./auth.service.js";
import { clearAuthCookie, setAuthCookie } from "../../utils/cookies.js";
import { getEnv } from "../../lib/env.js";

export const register = async (req: Request, res: Response) => {
  const env = getEnv();

  const { user, token } = await authService.register(req.body);

  setAuthCookie(res, token, env.NODE_ENV === "production");

  res.status(StatusCodes.CREATED).json({
    msg: "User created successfully",
    user,
  });
};

export const login = async (req: Request, res: Response) => {
  const env = getEnv();

  const { user, token } = await authService.login(req.body);

  setAuthCookie(res, token, env.NODE_ENV === "production");

  res.status(StatusCodes.OK).json({ msg: "User logged in successfully", user });
};

export const logout = async (req: Request, res: Response) => {
  const { token } = req.cookies;
  const env = getEnv();

  // If there's a token, blacklist it in Redis until it naturally expires
  if (token) {
    await authService.revokeToken(token);
  }

  clearAuthCookie(res, env.NODE_ENV === "production");

  return res.status(StatusCodes.OK).json({
    message: "User logged out successfully",
  });
};

export const authController = {
  register,
  login,
  logout,
};
