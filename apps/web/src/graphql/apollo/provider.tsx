"use client";

import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
import { TOKEN_GQL_LS_KEY } from "@vyrel/consts/web";
import type { ReactNode } from "react";

import { createApolloCache } from "./cache";
import { defaultApolloOptions, devtoolsOptions } from "./defaults";
import { createApolloLink } from "./links";
import { handleClientUnauthenticated } from "./unauthenticated.client";

function makeClient(): ApolloClient {
  return new ApolloClient({
    cache: createApolloCache(),
    defaultOptions: defaultApolloOptions,
    devtools: devtoolsOptions,
    link: createApolloLink({
      getExtraHeaders: (): Record<string, string> => {
        if (typeof window === "undefined") {
          return {};
        }

        const token = localStorage.getItem(TOKEN_GQL_LS_KEY);
        if (token === null || token.length === 0) {
          return {};
        }

        return {
          authorization: `Bearer ${token}`,
        };
      },
      onUnauthenticated: handleClientUnauthenticated,
    }),
  });
}

export function ApolloProvider({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
