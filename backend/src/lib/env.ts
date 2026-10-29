import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default("7d"),

  STREAM_API_KEY: z.string(),
  STREAM_API_SECRET: z.string(),

  // ImageKit credentials
  IMAGEKIT_PUBLIC_KEY: z.string(),
  IMAGEKIT_PRIVATE_KEY: z.string(),
  IMAGEKIT_URL_ENDPOINT: z.url(),

  // Redis URL (defaults to local Docker instance)
  REDIS_URL: z.url().default("redis://localhost:6379"),

  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv() {
  // safeParse
  // "Validate, clean, and type-check my env variables — and hand me back { success, data } or { success, error } instead of crashing."
  const parsedData = envSchema.safeParse(process.env);

  if (!parsedData.success) {
    console.error(z.treeifyError(parsedData.error));

    throw new Error("Invalid environment variables");
  }

  return parsedData.data;
}

let cachedEnv: Env | null = null;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }

  return cachedEnv;
}
