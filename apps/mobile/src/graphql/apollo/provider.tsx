import { ApolloClient } from "@apollo/client";
import { ApolloProvider as BaseApolloProvider } from "@apollo/client/react";
import { router } from "expo-router";
import { type ReactNode, useMemo } from "react";

import { AUTH_SIGN_IN } from "@/lib/routes";
import { createApolloCache } from "./cache";
import { defaultApolloOptions, devtoolsOptions } from "./defaults";
import { createApolloLink } from "./links";

function makeClient(): ApolloClient {
  return new ApolloClient({
    cache: createApolloCache(),
    defaultOptions: defaultApolloOptions,
    devtools: devtoolsOptions,
    link: createApolloLink({
      onUnauthenticated: () => {
        router.replace(AUTH_SIGN_IN);
      },
    }),
  });
}

export function ApolloProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => makeClient(), []);

  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
}
