import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getApiBaseURL } from "@/src/lib/api-base-url";
import { privilegedExtensionFetch } from "@/src/lib/auth/privileged-fetch";

export const authClient = createAuthClient({
  baseURL: getApiBaseURL(),
  fetchOptions: {
    customFetchImpl: privilegedExtensionFetch,
  },
  plugins: [organizationClient()],
});

export type ExtensionSession = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>;
