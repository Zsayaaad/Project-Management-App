import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string({ error: "Full name is required" })
    .min(1, "Full name is required")
    .max(20, "Full name cannot exceed 20 characters"),

  email: z.email({
    error: "Invalid email format",
  }),

  password: z
    .string()
    .min(8, "password must be at least 8 characters long")
    .max(20, "Password cannot exceed 20 characters"),

  role: z.unknown().optional(),
});

export const loginSchema = z.object({
  email: z.email({
    error: "invalid email format",
  }),

  password: z.string().min(1, "password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
