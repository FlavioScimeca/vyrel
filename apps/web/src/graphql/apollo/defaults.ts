import type { ApolloClient } from "@apollo/client";

export const defaultApolloOptions: ApolloClient.DefaultOptions = {
  query: {
    fetchPolicy: "cache-first",
  },
  watchQuery: {
    fetchPolicy: "cache-first",
    nextFetchPolicy: "cache-first",
  },
};

export const devtoolsOptions: ApolloClient.DevtoolsOptions = {
  enabled: process.env.NODE_ENV === "development",
  name: "vyrel-web",
};
