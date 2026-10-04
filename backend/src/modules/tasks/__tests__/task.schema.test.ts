import { TaskPriority, TaskStatus } from "@prisma/client";
import {
  createTaskBodySchema,
  getAllTasksQuerySchema,
  taskIdParamSchema,
  updateTaskBodySchema,
} from "../task.schema.js";

describe("Task Schemas", () => {
  describe("taskIdParamSchema", () => {
    it("accepts valid UUID", () => {
      const result = taskIdParamSchema.safeParse({
        taskId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.success).toBe(true);
    });

    it.each([
      ["invalid UUID", { taskId: "not-a-uuid" }],
      ["empty string", { taskId: "" }],
      ["missing taskId", {}],
    ])("rejects %s", (_case, input) => {
      expect(taskIdParamSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("createTaskBodySchema", () => {
    const validInput = {
      title: "Build Auth",
      description: "Implement JWT authentication",
      dueDate: "2026-10-01",
      assigneeId: "123e4567-e89b-12d3-a456-426614174000",
    };

    it("accepts valid task creation input", () => {
      expect(createTaskBodySchema.safeParse(validInput).success).toBe(true);
    });

    it("accepts valid input with optional status and priority", () => {
      const result = createTaskBodySchema.safeParse({
        ...validInput,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid dueDate format with correct message", () => {
      const result = createTaskBodySchema.safeParse({
        ...validInput,
        dueDate: "01/10/2026",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.message === "Invalid date format. Must be YYYY-MM-DD",
          ),
        ).toBe(true);
      }
    });

    it.each([
      ["title too short (2 chars)", { ...validInput, title: "ab" }],
      ["title too long (151 chars)", { ...validInput, title: "a".repeat(151) }],
      ["missing title", { ...validInput, title: undefined }],
      ["empty description", { ...validInput, description: "" }],
      [
        "description too long (1001 chars)",
        { ...validInput, description: "a".repeat(1001) },
      ],
      ["missing dueDate", { ...validInput, dueDate: undefined }],
      ["missing assigneeId", { ...validInput, assigneeId: undefined }],
      ["invalid assigneeId", { ...validInput, assigneeId: "not-a-uuid" }],
      ["invalid status", { ...validInput, status: "INVALID" }],
      ["invalid priority", { ...validInput, priority: "URGENT" }],
    ])("rejects %s", (_case, input) => {
      expect(createTaskBodySchema.safeParse(input).success).toBe(false);
    });
  });

  describe("getAllTasksQuerySchema", () => {
    it("accepts valid query with all fields", () => {
      const result = getAllTasksQuerySchema.safeParse({
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        search: "auth",
        page: "2",
        limit: "20",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty query and applies defaults", () => {
      const result = getAllTasksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.status).toBeUndefined();
        expect(result.data.priority).toBeUndefined();
      }
    });

    it("transforms 'all' status to undefined", () => {
      const result = getAllTasksQuerySchema.safeParse({ status: "all" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("transforms empty string status to undefined", () => {
      const result = getAllTasksQuerySchema.safeParse({ status: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("transforms blank search to undefined", () => {
      const result = getAllTasksQuerySchema.safeParse({ search: "   " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });

    it("transforms empty string page/limit to defaults", () => {
      const result = getAllTasksQuerySchema.safeParse({ page: "", limit: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it.each([
      ["invalid status", { status: "BLOCKED" }],
      ["invalid priority", { priority: "URGENT" }],
      ["negative page", { page: "-1" }],
      ["zero limit", { limit: "0" }],
      ["limit over 100", { limit: "101" }],
    ])("rejects %s", (_case, input) => {
      expect(getAllTasksQuerySchema.safeParse(input).success).toBe(false);
    });
  });

  describe("updateTaskBodySchema", () => {
    it("accepts valid update with single field", () => {
      expect(
        updateTaskBodySchema.safeParse({ status: TaskStatus.DONE }).success,
      ).toBe(true);
    });

    it("accepts valid update with multiple fields", () => {
      const result = updateTaskBodySchema.safeParse({
        title: "Updated Title",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (all fields optional)", () => {
      expect(updateTaskBodySchema.safeParse({}).success).toBe(true);
    });

    it.each([
      ["title too short", { title: "ab" }],
      ["title too long (151 chars)", { title: "a".repeat(151) }],
      ["description too long (1001 chars)", { description: "a".repeat(1001) }],
      ["invalid dueDate format", { dueDate: "2026/10/01" }],
      ["invalid assigneeId", { assigneeId: "not-a-uuid" }],
    ])("rejects %s", (_case, input) => {
      expect(updateTaskBodySchema.safeParse(input).success).toBe(false);
    });
  });
});
