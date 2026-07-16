import { env } from "@vyrel/env/web";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function createWebAuthClient() {
  return createAuthClient({
    baseURL:
      typeof window === "undefined"
        ? env.NEXT_PUBLIC_SERVER_URL
        : window.location.origin,
    plugins: [organizationClient()],
  });
}

type AuthClient = ReturnType<typeof createWebAuthClient>;

let authClientInstance: AuthClient | undefined;

/** Lazily created so SSR does not pin the API server origin on the client. */
function getAuthClient(): AuthClient {
  authClientInstance ??= createWebAuthClient();
  return authClientInstance;
}

export const authClient = new Proxy({} as AuthClient, {
  get(_target, property, receiver) {
    return Reflect.get(getAuthClient(), property, receiver);
  },
});
