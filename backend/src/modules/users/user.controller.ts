import { Request, Response } from "express";
import { userService } from "./user.service.js";
import { StatusCodes } from "http-status-codes";
import { clearAuthCookie } from "../../utils/cookies.js";
import { getEnv } from "../../lib/env.js";

export const getCurrentUser = async (req: Request, res: Response) => {
  const user = await userService.getCurrentUser(req.user!.userId);

  return res.status(StatusCodes.OK).json({
    user,
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  const newUser = await userService.updateProfile(req.user!.userId, req.body);

  res.status(StatusCodes.OK).json({ msg: "update user", newUser });
};

export const updateAvatar = async (req: Request, res: Response) => {
  const updatedUser = await userService.updateAvatar(
    req.user!.userId,
    req.body,
  );
  res.status(StatusCodes.OK).json({
    message: "Avatar updated successfully",
    user: updatedUser,
  });
};

export const changePassword = async (req: Request, res: Response) => {
  const result = await userService.changePassword(req.user!.userId, req.body);

  return res.status(StatusCodes.OK).json({
    message: result.message,
  });
};

export const deleteAccount = async (req: Request, res: Response) => {
  const result = await userService.deleteAccount(req.user!.userId, req.body);
  const env = getEnv();

  clearAuthCookie(res, env.NODE_ENV === "production");

  return res.status(StatusCodes.OK).json({
    message: result.message,
  });
};

export const userController = {
  getCurrentUser,
  updateProfile,
  updateAvatar,
  changePassword,
  deleteAccount,
};
