import {
  addMemberSchema,
  createProjectSchema,
  getAllProjectsQuerySchema,
  updateProjectSchema,
} from "../projects.schema.js";

describe("Project Schemas", () => {
  describe("createProjectSchema", () => {
    const valid = { name: "Project Alpha", description: "A test project" };

    it.each([
      ["valid full input", valid],
      ["missing optional description", { name: "Project Alpha" }],
      ["minimum name length (3)", { name: "abc" }],
      ["maximum name length (100)", { name: "a".repeat(100) }],
    ])("accepts %s", (_case, input) => {
      expect(createProjectSchema.safeParse(input).success).toBe(true);
    });

    it.each([
      ["missing name", { description: "test" }],
      ["name too short", { name: "ab" }],
      ["name too long", { name: "a".repeat(101) }],
      ["description too long", { name: "Alpha", description: "a".repeat(501) }],
    ])("rejects %s", (_case, input) => {
      expect(createProjectSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("updateProjectSchema", () => {
    it.each([
      ["empty object (all optional)", {}],
      ["only name", { name: "New Name" }],
      ["only description", { description: "New Desc" }],
    ])("accepts %s", (_case, input) => {
      expect(updateProjectSchema.safeParse(input).success).toBe(true);
    });

    it.each([
      ["name too short", { name: "ab" }],
      ["name too long", { name: "a".repeat(101) }],
      ["description too long", { description: "a".repeat(501) }],
    ])("rejects %s", (_case, input) => {
      expect(updateProjectSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("addMemberSchema", () => {
    it("accepts valid email", () => {
      expect(
        addMemberSchema.safeParse({ email: "test@example.com" }).success,
      ).toBe(true);
    });

    it.each([
      ["missing email", {}],
      ["invalid email", { email: "not-an-email" }],
      ["empty email", { email: "" }],
    ])("rejects %s", (_case, input) => {
      expect(addMemberSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("getAllProjectsQuerySchema", () => {
    it.each([
      [
        "valid full query",
        { search: "test", sort: "newest", page: "2", limit: "10" },
      ],
      ["empty search string transforms to undefined", { search: "" }],
      ["whitespace search string transforms to undefined", { search: "   " }],
      ["missing optionals", {}],
    ])("accepts %s", (_case, input) => {
      expect(getAllProjectsQuerySchema.safeParse(input).success).toBe(true);
    });

    it("correctly transforms empty search to undefined", () => {
      const result = getAllProjectsQuerySchema.safeParse({ search: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it.each([
      ["invalid sort enum", { sort: "random" }],
      ["negative page", { page: "-1" }],
      ["zero limit", { limit: "0" }],
      ["limit over 100", { limit: "101" }],
    ])("rejects %s", (_case, input) => {
      expect(getAllProjectsQuerySchema.safeParse(input).success).toBe(false);
    });
  });
});
