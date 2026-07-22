"use client";

import {
  ApolloClient,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
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
