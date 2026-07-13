import type { ApolloClient as BaseApolloClient } from "@apollo/client";
import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { cookies } from "next/headers";

import { createApolloCache } from "./cache";
import { defaultApolloOptions, devtoolsOptions } from "./defaults";
import { createApolloLink } from "./links";
import { redirectIfUnauthenticated } from "./unauthenticated.server";

function makeRscClient(): ApolloClient {
  return new ApolloClient({
    cache: createApolloCache(),
    defaultOptions: defaultApolloOptions,
    devtools: devtoolsOptions,
    link: createApolloLink({
      getExtraHeaders: async () => {
        const cookieStore = await cookies();
        return {
          cookie: cookieStore.toString(),
        };
      },
    }),
  });
}

export const { getClient, PreloadQuery } = registerApolloClient(makeRscClient);

/** RSC query helper — redirects to `/auth` on UNAUTHENTICATED. */
export async function queryWithAuth(options: BaseApolloClient.QueryOptions) {
  const result = await getClient().query(options);
  redirectIfUnauthenticated(result.error);
  return result;
}
