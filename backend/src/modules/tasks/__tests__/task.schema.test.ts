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
      ["non-string", { taskId: 123 }],
    ])("rejects %s", (_case, input) => {
      expect(taskIdParamSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("createTaskBodySchema", () => {
    const validTask = {
      title: "Build Auth",
      description: "Implement JWT authentication",
      dueDate: "2026-10-01",
      assigneeId: "123e4567-e89b-12d3-a456-426614174000",
    };

    it.each([
      ["valid minimal input", validTask],
      [
        "valid with status and priority",
        { ...validTask, status: "IN_PROGRESS", priority: "HIGH" },
      ],
      ["title at minimum length (3)", { ...validTask, title: "abc" }],
      [
        "title at maximum length (150)",
        { ...validTask, title: "a".repeat(150) },
      ],
      [
        "description at maximum (1000)",
        { ...validTask, description: "a".repeat(1000) },
      ],
    ])("accepts %s", (_case, input) => {
      expect(createTaskBodySchema.safeParse(input).success).toBe(true);
    });

    it.each([
      ["missing title", { ...validTask, title: undefined }],
      ["title too short", { ...validTask, title: "ab" }],
      ["title too long", { ...validTask, title: "a".repeat(151) }],
      ["missing description", { ...validTask, description: undefined }],
      ["empty description", { ...validTask, description: "" }],
      ["description too long", { ...validTask, description: "a".repeat(1001) }],
      ["missing dueDate", { ...validTask, dueDate: undefined }],
      ["invalid dueDate format", { ...validTask, dueDate: "01-10-2026" }],
      ["invalid dueDate format 2", { ...validTask, dueDate: "2026/10/01" }],
      ["missing assigneeId", { ...validTask, assigneeId: undefined }],
      ["invalid assigneeId", { ...validTask, assigneeId: "not-uuid" }],
      ["invalid status", { ...validTask, status: "INVALID" }],
      ["invalid priority", { ...validTask, priority: "URGENT" }],
    ])("rejects %s", (_case, input) => {
      expect(createTaskBodySchema.safeParse(input).success).toBe(false);
    });

    it("accepts all valid TaskStatus values", () => {
      for (const status of Object.values(TaskStatus)) {
        const result = createTaskBodySchema.safeParse({ ...validTask, status });
        expect(result.success).toBe(true);
      }
    });

    it("accepts all valid TaskPriority values", () => {
      for (const priority of Object.values(TaskPriority)) {
        const result = createTaskBodySchema.safeParse({
          ...validTask,
          priority,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("getAllTasksQuerySchema", () => {
    it.each([
      ["empty query (all defaults)", {}],
      [
        "valid full query",
        {
          status: "TODO",
          priority: "HIGH",
          search: "auth",
          page: "2",
          limit: "20",
        },
      ],
      ["status 'all' preprocesses to undefined", { status: "all" }],
      ["status empty string preprocesses to undefined", { status: "" }],
      ["priority 'all' preprocesses to undefined", { priority: "all" }],
      ["search blank string preprocesses to undefined", { search: "   " }],
      ["page empty string uses default", { page: "" }],
      ["limit empty string uses default", { limit: "" }],
    ])("accepts %s", (_case, input) => {
      expect(getAllTasksQuerySchema.safeParse(input).success).toBe(true);
    });

    it("correctly preprocesses 'all' status to undefined", () => {
      const result = getAllTasksQuerySchema.safeParse({ status: "all" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBeUndefined();
      }
    });

    it("applies correct defaults", () => {
      const result = getAllTasksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.status).toBeUndefined();
        expect(result.data.priority).toBeUndefined();
      }
    });

    it.each([
      ["invalid status", { status: "BLOCKED" }],
      ["invalid priority", { priority: "CRITICAL" }],
      ["negative page", { page: "-1" }],
      ["zero limit", { limit: "0" }],
      ["limit over 100", { limit: "101" }],
    ])("rejects %s", (_case, input) => {
      expect(getAllTasksQuerySchema.safeParse(input).success).toBe(false);
    });
  });

  describe("updateTaskBodySchema", () => {
    it.each([
      ["empty object (all optional)", {}],
      ["only title", { title: "New Title" }],
      ["only status", { status: "DONE" }],
      ["only priority", { priority: "LOW" }],
      ["only dueDate", { dueDate: "2026-12-01" }],
      [
        "only assigneeId",
        { assigneeId: "123e4567-e89b-12d3-a456-426614174000" },
      ],
      [
        "full update",
        {
          title: "New",
          description: "Desc",
          status: "DONE",
          priority: "HIGH",
          dueDate: "2026-12-01",
          assigneeId: "123e4567-e89b-12d3-a456-426614174000",
        },
      ],
    ])("accepts %s", (_case, input) => {
      expect(updateTaskBodySchema.safeParse(input).success).toBe(true);
    });

    it.each([
      ["title too short", { title: "ab" }],
      ["title too long", { title: "a".repeat(151) }],
      ["description too long", { description: "a".repeat(1001) }],
      ["invalid status", { status: "BLOCKED" }],
      ["invalid priority", { priority: "URGENT" }],
      ["invalid dueDate format", { dueDate: "12/01/2026" }],
      ["invalid assigneeId", { assigneeId: "not-uuid" }],
    ])("rejects %s", (_case, input) => {
      expect(updateTaskBodySchema.safeParse(input).success).toBe(false);
    });
  });
});
