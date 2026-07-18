import { InMemoryCache } from "@apollo/client-integration-nextjs";

/** Shared Apollo cache config for RSC and client runtimes. */
export function createApolloCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      Organization: {
        keyFields: ["slug"],
      },
      Query: {
        fields: {
          tasks: {
            keyArgs: ["organizationId"],
          },
        },
      },
      Task: {
        keyFields: ["id"],
      },
      // User has no `id` in the public schema; email is stable for normalization.
      User: {
        keyFields: ["email"],
      },
    },
  });
}
