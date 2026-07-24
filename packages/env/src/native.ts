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
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  },
});
