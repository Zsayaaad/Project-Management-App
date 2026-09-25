import { Role } from "@prisma/client";
import { isAdmin, parseRole } from "../roles.js";

describe("Role Utilities", () => {
  describe("parseRole", () => {
    it("should return ADMIN when 'ADMIN' is passed", () => {
      expect(parseRole("ADMIN")).toBe(Role.ADMIN);
    });

    it("should return MEMBER when 'MEMBER' is passed", () => {
      expect(parseRole("MEMBER")).toBe(Role.MEMBER);
    });

    it("should default to MEMBER for invalid strings", () => {
      expect(parseRole("SUPER_ADMIN")).toBe(Role.MEMBER);
      expect(parseRole("")).toBe(Role.MEMBER);
    });

    it("should default to MEMBER for non-string types", () => {
      expect(parseRole(null)).toBe(Role.MEMBER);
      expect(parseRole(undefined)).toBe(Role.MEMBER);
      expect(parseRole(123)).toBe(Role.MEMBER);
    });
  });

  describe("isAdmin", () => {
    it("should return true for ADMIN role", () => {
      expect(isAdmin(Role.ADMIN)).toBe(true);
    });

    it("should return false for MEMBER role", () => {
      expect(isAdmin(Role.MEMBER)).toBe(false);
    });
  });
});
