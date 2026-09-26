import {
  changePasswordSchema,
  deleteAccountSchema,
  updateAvatarSchema,
  updateProfileSchema,
} from "../user.schema.js";

describe("User Schemas", () => {
  describe("updateProfileSchema", () => {
    const validProfile = { name: "Jane", email: "jane@example.com" };

    it.each([
      ["valid full input", validProfile],
      ["only name", { name: "Jane" }],
      ["only email", { email: "jane@example.com" }],
      ["empty object (all optional)", {}],
    ])("accepts %s", (_case, input) => {
      expect(updateProfileSchema.safeParse(input).success).toBe(true);
    });

    it.each([
      ["empty name", { name: "" }],
      ["name too long", { name: "a".repeat(21) }],
      ["non-string name", { name: 123 }],
      ["invalid email", { email: "not-an-email" }],
      ["non-string email", { email: 123 }],
    ])("rejects %s", (_case, input) => {
      expect(updateProfileSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("updateAvatarSchema", () => {
    it.each([
      ["valid https URL", { avatarUrl: "https://ik.imagekit.io/avatar.jpg" }],
      ["valid http URL", { avatarUrl: "http://example.com/img.png" }],
    ])("accepts %s", (_case, input) => {
      expect(updateAvatarSchema.safeParse(input).success).toBe(true);
    });

    it.each([
      ["missing avatarUrl", {}],
      ["empty string", { avatarUrl: "" }],
      ["not a URL", { avatarUrl: "just-a-string" }],
      ["non-string", { avatarUrl: 123 }],
    ])("rejects %s", (_case, input) => {
      expect(updateAvatarSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("changePasswordSchema", () => {
    const validPassword = {
      currentPassword: "oldpass123",
      newPassword: "newpass456",
      confirmNewPassword: "newpass456",
    };

    it("accepts valid password change", () => {
      expect(changePasswordSchema.safeParse(validPassword).success).toBe(true);
    });

    it.each([
      [
        "missing currentPassword",
        { ...validPassword, currentPassword: undefined },
      ],
      ["empty currentPassword", { ...validPassword, currentPassword: "" }],
      ["missing newPassword", { ...validPassword, newPassword: undefined }],
      ["newPassword too short", { ...validPassword, newPassword: "short" }],
      [
        "missing confirmNewPassword",
        { ...validPassword, confirmNewPassword: undefined },
      ],
      [
        "empty confirmNewPassword",
        { ...validPassword, confirmNewPassword: "" },
      ],
    ])("rejects %s", (_case, input) => {
      expect(changePasswordSchema.safeParse(input).success).toBe(false);
    });

    it("rejects when passwords do not match", () => {
      const result = changePasswordSchema.safeParse({
        ...validPassword,
        confirmNewPassword: "different",
      });

      expect(result.success).toBe(false);
    });

    it("rejects when new password equals current password", () => {
      const result = changePasswordSchema.safeParse({
        ...validPassword,
        newPassword: validPassword.currentPassword,
        confirmNewPassword: validPassword.currentPassword,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("deleteAccountSchema", () => {
    it("accepts valid password", () => {
      expect(
        deleteAccountSchema.safeParse({ password: "pass123" }).success,
      ).toBe(true);
    });

    it.each([
      ["missing password", {}],
      ["empty password", { password: "" }],
      ["non-string password", { password: 123 }],
    ])("rejects %s", (_case, input) => {
      expect(deleteAccountSchema.safeParse(input).success).toBe(false);
    });
  });
});
