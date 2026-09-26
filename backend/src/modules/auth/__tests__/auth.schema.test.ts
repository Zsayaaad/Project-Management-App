import { loginSchema, registerSchema } from "../auth.schema.js";

const validRegister = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  password: "password123",
};

const validLogin = {
  email: "jane@example.com",
  password: "password123",
};

describe("Auth Schemas", () => {
  describe("registerSchema", () => {
    it.each([
      ["valid input", validRegister],
      ["minimum fullName length", { ...validRegister, fullName: "a" }],
      [
        "maximum fullName length",
        { ...validRegister, fullName: "a".repeat(20) },
      ],
      [
        "minimum password length",
        { ...validRegister, password: "a".repeat(8) },
      ],
      [
        "maximum password length",
        { ...validRegister, password: "a".repeat(20) },
      ],
      ["optional role", { ...validRegister, role: "ADMIN" }],
      ["unknown role value", { ...validRegister, role: "ADMIN" }],
    ])("accepts %s", (_caseName, input) => {
      const result = registerSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it.each([
      ["missing fullName", { ...validRegister, fullName: undefined }],
      ["empty fullName", { ...validRegister, fullName: "" }],
      ["fullName too long", { ...validRegister, fullName: "a".repeat(21) }],
      ["non-string fullName", { ...validRegister, fullName: 123 }],
      ["missing email", { ...validRegister, email: undefined }],
      ["invalid email", { ...validRegister, email: "not-an-email" }],
      ["non-string email", { ...validRegister, email: 123 }],
      ["missing password", { ...validRegister, password: undefined }],
      ["password too short", { ...validRegister, password: "a".repeat(7) }],
      ["password too long", { ...validRegister, password: "a".repeat(21) }],
      ["non-string password", { ...validRegister, password: 123 }],
    ])("rejects %s", (_caseName, input) => {
      const result = registerSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("confirms custom fullName error message wiring", () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        fullName: "",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          "Full name is required",
        );
      }
    });
  });

  describe("loginSchema", () => {
    it.each([
      ["valid input", validLogin],
      ["minimum password length", { ...validLogin, password: "p" }],
    ])("accepts %s", (_caseName, input) => {
      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it.each([
      ["missing email", { ...validLogin, email: undefined }],
      ["invalid email", { ...validLogin, email: "not-an-email" }],
      ["non-string email", { ...validLogin, email: 123 }],
      ["missing password", { ...validLogin, password: undefined }],
      ["empty password", { ...validLogin, password: "" }],
      ["non-string password", { ...validLogin, password: 123 }],
    ])("rejects %s", (_caseName, input) => {
      const result = loginSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("confirms custom password error message wiring", () => {
      const result = loginSchema.safeParse({
        ...validLogin,
        password: "",
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.message)).toContain(
          "password is required",
        );
      }
    });
  });
});
