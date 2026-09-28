import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters long")
    .max(100, "Project name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters long")
    .max(100, "Project name cannot exceed 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
});

export const addMemberSchema = z.object({
  email: z.email("Invalid email format"),
});

export const getAllProjectsQuerySchema = z.object({
  // FIX: Removed .min(1) so the transform can successfully convert "" to undefined
  search: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  sort: z.enum(["a-z", "z-a", "newest", "oldest"]).default("newest").optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(4),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type GetAllProjectsQueryInput = z.infer<
  typeof getAllProjectsQuerySchema
>;
