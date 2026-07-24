import { initGraphQLTada } from "gql.tada";

import type { introspection } from "../../graphql-env.d.ts";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    File: unknown;
    JSON: unknown;
    URL: string;
  };
}>();
