import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { envBoolean } from "./utils/env-boolean";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    DATABASE_AUTH_TOKEN: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warning", "error", "fatal"]),
    MEDIA_MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(100 * 1024 * 1024),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PROFILE_SQL_LIMIT: z.coerce.number().int().positive().default(20),
    PROFILING: envBoolean.default(false),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    /** Set to `eu` (or `fedramp`) when the bucket uses a Cloudflare jurisdiction. */
    R2_JURISDICTION: z.enum(["eu", "fedramp"]),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.string().min(1),
  },
});
