import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .trim()
    .optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
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

// Express parses ?page= as "". We treat "" as undefined so .default() can apply.
const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

export const getAllProjectsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  sort: z.enum(["a-z", "z-a", "newest", "oldest"]).default("newest"),

  // Preprocess empty strings to undefined before coercing to number
  page: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().default(1),
  ),
  limit: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().max(100).default(4),
  ),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type GetAllProjectsQueryInput = z.infer<
  typeof getAllProjectsQuerySchema
>;
