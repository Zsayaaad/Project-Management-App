import { Response } from "express";
import {
  clearAuthCookie,
  getCookieOptions,
  setAuthCookie,
} from "../cookies.js";

// Here we use mock Express Response objects to verify the exact cookie configuration.
describe("Cookie Utilities", () => {
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockRes = {
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  });

  describe("getCookieOptions", () => {
    it("should set secure to true in production", () => {
      const options = getCookieOptions(true);
      expect(options.secure).toBe(true);
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe("strict");
      expect(options.maxAge).toBe(1000 * 60 * 60 * 24 * 7);
    });

    it("should set secure to false in development", () => {
      const options = getCookieOptions(false);
      expect(options.secure).toBe(false);
    });
  });

  describe("setAuthCookie", () => {
    it("should set the token cookie with correct options", () => {
      setAuthCookie(mockRes as Response, "my-jwt-token", true);

      expect(mockRes.cookie).toHaveBeenCalledWith("token", "my-jwt-token", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
    });
  });

  describe("clearAuthCookie", () => {
    it("should clear the token cookie with matching security flags", () => {
      clearAuthCookie(mockRes as Response, false);

      expect(mockRes.clearCookie).toHaveBeenCalledWith("token", {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });
    });
  });
});
