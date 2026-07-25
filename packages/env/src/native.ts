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
    APK_NAME: process.env.APK_NAME,
    // @effect-diagnostics processEnv:off
    BUCKET_REPO: process.env.BUCKET_REPO,
    // @effect-diagnostics processEnv:off
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  },
  server: {
    /** Output APK filename for local publish (`apps/mobile/scripts/publish-dev-apk.ts`). */
    APK_NAME: z.string().min(1).default("app-dev.apk"),
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
