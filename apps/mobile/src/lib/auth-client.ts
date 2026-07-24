import { expoClient } from "@better-auth/expo/client";
import { env } from "@vyrel/env/native";
import type { BetterAuthClientPlugin } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getItem, setItem } from "expo-secure-store";

/**
 * Type source of truth: organization plugin only.
 * Expo's plugin is required at runtime but its BetterFetch `getActions` types
 * are incompatible with `BetterAuthClientPlugin`. Casting that plugin onto the
 * plugins array erases org endpoints (`setActive`) and session fields — so we
 * type the client from org-only config, then assert the runtime client.
 */
function createTypedAuthClient() {
  return createAuthClient({
    baseURL: env.EXPO_PUBLIC_SERVER_URL,
    plugins: [organizationClient()],
  });
}

export type MobileAuthClient = ReturnType<typeof createTypedAuthClient> & {
  getCookie: () => string;
};

export type SessionData = NonNullable<
  ReturnType<MobileAuthClient["useSession"]>["data"]
>;

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [
    organizationClient(),
    expoClient({
      scheme: "mobile",
      storage: { getItem, setItem },
      storagePrefix: "vyrel",
    }) as unknown as BetterAuthClientPlugin,
  ],
}) as unknown as MobileAuthClient;
