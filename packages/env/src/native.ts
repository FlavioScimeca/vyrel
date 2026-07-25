import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    // Default targets Android emulator → host. Override for device/iOS in apps/mobile/.env.
    EXPO_PUBLIC_SERVER_URL: z.url().default("http://10.0.2.2:3000"),
  },
  clientPrefix: "EXPO_PUBLIC_",
  emptyStringAsUndefined: true,
  // Explicit member access so Metro/Expo can inline EXPO_PUBLIC_* at bundle time.
  runtimeEnv: {
    // @effect-diagnostics processEnv:off
    APP_SLUG: process.env.APP_SLUG,
    // @effect-diagnostics processEnv:off
    BUCKET_REPO: process.env.BUCKET_REPO,
    // @effect-diagnostics processEnv:off
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  },
  server: {
    /**
     * App id in the public APK bucket (release tag + `{APP_SLUG}-dev-app.apk`).
     * Defaults to `vyrel` so Expo can boot without publish env.
     */
    APP_SLUG: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/, "Expected lowercase slug (e.g. vyrel)")
      .default("vyrel"),
    /**
     * GitHub `owner/repo` for APK releases (publish script only).
     * Optional here so the Expo app can boot without it.
     */
    BUCKET_REPO: z
      .string()
      .regex(/^[^/]+\/[^/]+$/, "Expected owner/repo")
      .optional(),
  },
});
