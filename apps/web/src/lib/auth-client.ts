import { env } from "@vyrel/env/web";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

type AuthClient = ReturnType<typeof createAuthClient>;

let authClientInstance: AuthClient | undefined;

function createWebAuthClient(): AuthClient {
  return createAuthClient({
    baseURL:
      typeof window === "undefined"
        ? env.NEXT_PUBLIC_SERVER_URL
        : window.location.origin,
    plugins: [organizationClient()],
  });
}

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
