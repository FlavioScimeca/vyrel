import { InMemoryCache } from "@apollo/client";
import { configureGraphqlClientCache } from "@vyrel/graphql-client/cache";
import {
  graphqlClientRegistry,
  graphqlClientTypePolicies,
} from "@/graphql/generated/client-schema";

export function createApolloCache(): InMemoryCache {
  const cache = new InMemoryCache({
    typePolicies: {
      ...graphqlClientTypePolicies,
      Query: {
        fields: {
          tasks: {
            keyArgs: ["organizationId", "search", "createdFrom", "createdTo"],
          },
        },
      },
    },
  });

  return configureGraphqlClientCache(cache, graphqlClientRegistry);
}
