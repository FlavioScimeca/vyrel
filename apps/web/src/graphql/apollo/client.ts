import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { headers } from "next/headers";

import { createApolloCache } from "./cache";
import { defaultApolloOptions, devtoolsOptions } from "./defaults";
import { createApolloLink } from "./links";

async function makeRscClient(): Promise<ApolloClient> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  const authorization = requestHeaders.get("authorization");
  const authenticationHeaders: Record<string, string> = {};

  if (cookie !== null) {
    authenticationHeaders.cookie = cookie;
  }

  if (authorization !== null) {
    authenticationHeaders.authorization = authorization;
  }

  return new ApolloClient({
    cache: createApolloCache(),
    defaultOptions: defaultApolloOptions,
    devtools: devtoolsOptions,
    link: createApolloLink({
      getExtraHeaders: () => authenticationHeaders,
    }),
  });
}

export const { PreloadQuery } = registerApolloClient(makeRscClient);
