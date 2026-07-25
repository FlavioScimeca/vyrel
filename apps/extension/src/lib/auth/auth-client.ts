import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getAuthBaseURL } from "@/src/lib/api-base-url";
import { privilegedExtensionFetch } from "@/src/lib/auth/privileged-fetch";

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  fetchOptions: {
    customFetchImpl: privilegedExtensionFetch,
  },
  plugins: [organizationClient()],
});

export type ExtensionSession = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;
