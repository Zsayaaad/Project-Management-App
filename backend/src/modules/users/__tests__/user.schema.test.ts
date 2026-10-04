import {
  changePasswordSchema,
  deleteAccountSchema,
  updateAvatarSchema,
  updateProfileSchema,
} from "../user.schema.js";

describe("User Schemas", () => {
  describe("updateProfileSchema", () => {
    it("accepts valid profile update with name and email", () => {
      const result = updateProfileSchema.safeParse({
        name: "New Name",
        email: "new@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("accepts partial update (name only)", () => {
      expect(updateProfileSchema.safeParse({ name: "New Name" }).success).toBe(
        true,
      );
    });

    it("accepts empty object (all fields optional)", () => {
      expect(updateProfileSchema.safeParse({}).success).toBe(true);
    });

    it.each([
      ["empty name", { name: "" }],
      ["name too long (21 chars)", { name: "a".repeat(21) }],
      ["invalid email", { email: "not-an-email" }],
    ])("rejects %s", (_case, input) => {
      expect(updateProfileSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("updateAvatarSchema", () => {
    it("accepts valid URL", () => {
      const result = updateAvatarSchema.safeParse({
        avatarUrl: "https://ik.imagekit.io/avatar.jpg",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid URL with correct message", () => {
      const result = updateAvatarSchema.safeParse({ avatarUrl: "not-a-url" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message === "Invalid avatar URL"),
        ).toBe(true);
      }
    });

    it.each([
      ["empty string", { avatarUrl: "" }],
      ["missing avatarUrl", {}],
    ])("rejects %s", (_case, input) => {
      expect(updateAvatarSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("changePasswordSchema", () => {
    const validInput = {
      currentPassword: "oldpass123",
      newPassword: "newpass456",
      confirmNewPassword: "newpass456",
    };

    it("accepts valid password change", () => {
      expect(changePasswordSchema.safeParse(validInput).success).toBe(true);
    });

    it("rejects mismatched passwords with correct message", () => {
      const result = changePasswordSchema.safeParse({
        ...validInput,
        confirmNewPassword: "different",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.message === "passwords do not match",
          ),
        ).toBe(true);
      }
    });

    it("rejects new password same as current", () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: "samepass123",
        newPassword: "samepass123",
        confirmNewPassword: "samepass123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) =>
              i.message ===
              "new password must be different from current password",
          ),
        ).toBe(true);
      }
    });

    it.each([
      [
        "missing currentPassword",
        { ...validInput, currentPassword: undefined },
      ],
      ["empty currentPassword", { ...validInput, currentPassword: "" }],
      [
        "newPassword too short (7 chars)",
        {
          ...validInput,
          newPassword: "a".repeat(7),
          confirmNewPassword: "a".repeat(7),
        },
      ],
      ["missing newPassword", { ...validInput, newPassword: undefined }],
      [
        "missing confirmNewPassword",
        { ...validInput, confirmNewPassword: undefined },
      ],
    ])("rejects %s", (_case, input) => {
      expect(changePasswordSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("deleteAccountSchema", () => {
    it("accepts valid password", () => {
      expect(
        deleteAccountSchema.safeParse({ password: "mypass123" }).success,
      ).toBe(true);
    });

    it.each([
      ["empty password", { password: "" }],
      ["missing password", {}],
    ])("rejects %s", (_case, input) => {
      expect(deleteAccountSchema.safeParse(input).success).toBe(false);
    });
  });
});
