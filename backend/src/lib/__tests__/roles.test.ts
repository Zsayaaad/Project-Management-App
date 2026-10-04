import { Role } from "@prisma/client";
import { isAdmin, parseRole } from "../roles.js";

describe("Role Utilities", () => {
  describe("parseRole", () => {
    it.each([
      ["ADMIN string", "ADMIN", Role.ADMIN],
      ["MEMBER string", "MEMBER", Role.MEMBER],
      ["lowercase admin", "admin", Role.MEMBER],
      ["invalid string", "SUPER_ADMIN", Role.MEMBER],
      ["empty string", "", Role.MEMBER],
      ["null", null, Role.MEMBER],
      ["undefined", undefined, Role.MEMBER],
      ["number", 123, Role.MEMBER],
      ["object", {}, Role.MEMBER],
    ])("returns %s for %s", (_case, input, expected) => {
      expect(parseRole(input)).toBe(expected);
    });
  });

  describe("isAdmin", () => {
    it.each([
      ["ADMIN role", Role.ADMIN, true],
      ["MEMBER role", Role.MEMBER, false],
    ])("returns %s for %s", (_case, role, expected) => {
      expect(isAdmin(role)).toBe(expected);
    });
  });
});
