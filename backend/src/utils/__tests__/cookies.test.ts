import { Response } from "express";
import {
  clearAuthCookie,
  getCookieOptions,
  setAuthCookie,
} from "../cookies.js";

describe("Cookie Utilities", () => {
  const SEVEN_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 7;

  describe("getCookieOptions", () => {
    it.each([
      ["production", true, true],
      ["development", false, false],
    ])("sets secure to %s in %s", (_case, isProduction, expectedSecure) => {
      const options = getCookieOptions(isProduction);

      expect(options.secure).toBe(expectedSecure);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("strict");
      expect(options.maxAge).toBe(SEVEN_DAYS_IN_MS);
    });
  });

  describe("setAuthCookie", () => {
    it("sets token cookie with correct options", () => {
      const mockRes = {
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response;

      setAuthCookie(mockRes, "jwt-token", true);

      expect(mockRes.cookie).toHaveBeenCalledWith("token", "jwt-token", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: SEVEN_DAYS_IN_MS,
      });
    });
  });

  describe("clearAuthCookie", () => {
    it("clears token cookie with matching security flags", () => {
      const mockRes = {
        clearCookie: jest.fn().mockReturnThis(),
      } as unknown as Response;

      clearAuthCookie(mockRes, false);

      expect(mockRes.clearCookie).toHaveBeenCalledWith("token", {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });
    });
  });
});
