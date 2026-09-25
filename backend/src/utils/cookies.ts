import { CookieOptions, Response } from "express";

const SEVEN_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 7;

export const getCookieOptions = (isProduction: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  maxAge: SEVEN_DAYS_IN_MS,
});

export const setAuthCookie = (
  res: Response,
  token: string,
  isProduction: boolean,
) => {
  res.cookie("token", token, getCookieOptions(isProduction));
};

export const clearAuthCookie = (res: Response, isProduction: boolean) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
  });
};
