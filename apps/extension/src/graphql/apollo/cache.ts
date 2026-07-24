import { InMemoryCache } from "@apollo/client";
import { configureGraphqlClientCache } from "@vyrel/graphql-client/cache";
import {
  graphqlClientRegistry,
  graphqlClientTypePolicies,
} from "@/src/graphql/generated/client-schema";

export function createApolloCache(): InMemoryCache {
  const cache = new InMemoryCache({
    typePolicies: {
      ...graphqlClientTypePolicies,
    },
  });

  return configureGraphqlClientCache(cache, graphqlClientRegistry);
}
