import { ApolloClient } from "@apollo/client";
import { ApolloProvider as BaseApolloProvider } from "@apollo/client/react";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { createApolloCache } from "./cache";
import { defaultApolloOptions, devtoolsOptions } from "./defaults";
import { createApolloLink } from "./links";

export type ApolloProviderProps = {
  children: ReactNode;
  onUnauthenticated?: () => void;
};

export function ApolloProvider({
  children,
  onUnauthenticated,
}: ApolloProviderProps) {
  const onUnauthenticatedRef = useRef(onUnauthenticated);
  useEffect(() => {
    onUnauthenticatedRef.current = onUnauthenticated;
  }, [onUnauthenticated]);

  const client = useMemo(
    () =>
      new ApolloClient({
        cache: createApolloCache(),
        defaultOptions: defaultApolloOptions,
        devtools: devtoolsOptions,
        link: createApolloLink({
          onUnauthenticated: () => {
            onUnauthenticatedRef.current?.();
          },
        }),
      }),
    []
  );

  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
}
