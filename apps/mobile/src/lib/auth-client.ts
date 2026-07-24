import { expoClient } from "@better-auth/expo/client";
import { env } from "@vyrel/env/native";
import type { BetterAuthClientPlugin } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getItem, setItem } from "expo-secure-store";

// @better-auth/expo's getActions arity lags BetterAuthClientPlugin (BetterFetch generics).
const expoAuthPlugin = expoClient({
  scheme: "mobile",
  storage: { getItem, setItem },
  storagePrefix: "vyrel",
}) as BetterAuthClientPlugin;

export const authClient = createAuthClient({
  baseURL: env.EXPO_PUBLIC_SERVER_URL,
  plugins: [expoAuthPlugin, organizationClient()],
});
