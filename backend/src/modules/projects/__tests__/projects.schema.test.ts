import {
  addMemberSchema,
  createProjectSchema,
  getAllProjectsQuerySchema,
  updateProjectSchema,
} from "../projects.schema.js";

describe("Project Schemas", () => {
  describe("createProjectSchema", () => {
    const validInput = {
      name: "My Project",
      description: "A test project",
    };

    it("accepts valid project creation input", () => {
      expect(createProjectSchema.safeParse(validInput).success).toBe(true);
    });

    it("rejects name too short with correct message", () => {
      const result = createProjectSchema.safeParse({
        ...validInput,
        name: "ab",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.message === "Project name must be at least 3 characters",
          ),
        ).toBe(true);
      }
    });

    it.each([
      ["empty name", { ...validInput, name: "" }],
      ["name too long (101 chars)", { ...validInput, name: "a".repeat(101) }],
      ["missing name", { ...validInput, name: undefined }],
      [
        "description too long (501 chars)",
        { ...validInput, description: "a".repeat(501) },
      ],
    ])("rejects %s", (_case, input) => {
      expect(createProjectSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("updateProjectSchema", () => {
    it("accepts valid update with name only", () => {
      expect(
        updateProjectSchema.safeParse({ name: "Updated Name" }).success,
      ).toBe(true);
    });

    it("accepts valid update with description only", () => {
      expect(
        updateProjectSchema.safeParse({ description: "New desc" }).success,
      ).toBe(true);
    });

    it("accepts empty object (all fields optional)", () => {
      expect(updateProjectSchema.safeParse({}).success).toBe(true);
    });

    it.each([
      ["name too short", { name: "ab" }],
      ["name too long (101 chars)", { name: "a".repeat(101) }],
      ["description too long (501 chars)", { description: "a".repeat(501) }],
    ])("rejects %s", (_case, input) => {
      expect(updateProjectSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("addMemberSchema", () => {
    it("accepts valid email", () => {
      expect(
        addMemberSchema.safeParse({ email: "user@test.com" }).success,
      ).toBe(true);
    });

    it.each([
      ["invalid email", { email: "not-an-email" }],
      ["missing email", {}],
    ])("rejects %s", (_case, input) => {
      expect(addMemberSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("getAllProjectsQuerySchema", () => {
    it("accepts valid query with all fields", () => {
      const result = getAllProjectsQuerySchema.safeParse({
        search: "test",
        sort: "newest",
        page: "2",
        limit: "10",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty query and applies defaults", () => {
      const result = getAllProjectsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort).toBe("newest");
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(4);
      }
    });

    it("transforms blank search (spaces) to undefined", () => {
      const result = getAllProjectsQuerySchema.safeParse({ search: "   " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("transforms empty string search to undefined", () => {
      const result = getAllProjectsQuerySchema.safeParse({ search: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("transforms empty string page/limit to defaults instead of failing", () => {
      const result = getAllProjectsQuerySchema.safeParse({
        page: "",
        limit: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(4);
      }
    });

    it.each([
      ["invalid sort value", { sort: "invalid" }],
      ["negative page", { page: "-1" }],
      ["zero limit", { limit: "0" }],
      ["limit over 100", { limit: "101" }],
    ])("rejects %s", (_case, input) => {
      expect(getAllProjectsQuerySchema.safeParse(input).success).toBe(false);
    });
  });
});
