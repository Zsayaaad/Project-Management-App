import { loginSchema, registerSchema } from "../auth.schema.js";

describe("Auth Schemas", () => {
  describe("registerSchema", () => {
    const validInput = {
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    };

    it("accepts valid registration input", () => {
      const result = registerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("accepts valid input with optional role", () => {
      const result = registerSchema.safeParse({ ...validInput, role: "ADMIN" });
      expect(result.success).toBe(true);
    });

    it("rejects missing fullName with correct message", () => {
      const result = registerSchema.safeParse({
        ...validInput,
        fullName: undefined,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.message === "Full name is required",
          ),
        ).toBe(true);
      }
    });

    it.each([
      ["empty fullName", { ...validInput, fullName: "" }],
      [
        "fullName too long (21 chars)",
        { ...validInput, fullName: "a".repeat(21) },
      ],
      ["missing email", { ...validInput, email: undefined }],
      ["invalid email format", { ...validInput, email: "not-an-email" }],
      [
        "password too short (7 chars)",
        { ...validInput, password: "a".repeat(7) },
      ],
      [
        "password too long (21 chars)",
        { ...validInput, password: "a".repeat(21) },
      ],
      ["missing password", { ...validInput, password: undefined }],
    ])("rejects %s", (_case, input) => {
      expect(registerSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    const validInput = {
      email: "jane@example.com",
      password: "password123",
    };

    it("accepts valid login input", () => {
      expect(loginSchema.safeParse(validInput).success).toBe(true);
    });

    it("rejects invalid email with correct message", () => {
      const result = loginSchema.safeParse({ ...validInput, email: "bad" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message === "invalid email format"),
        ).toBe(true);
      }
    });

    it.each([
      ["missing email", { ...validInput, email: undefined }],
      ["empty password", { ...validInput, password: "" }],
      ["missing password", { ...validInput, password: undefined }],
    ])("rejects %s", (_case, input) => {
      expect(loginSchema.safeParse(input).success).toBe(false);
    });
  });
});
