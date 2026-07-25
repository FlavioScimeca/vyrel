import { ApolloLink } from "@apollo/client/link";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { HttpLink } from "@apollo/client/link/http";

import { getGraphqlUri } from "@/src/lib/api-base-url";
import { privilegedExtensionFetch } from "@/src/lib/auth/privileged-fetch";
import { isUnauthenticatedError } from "./unauthenticated";

export type CreateApolloLinkOptions = {
  onUnauthenticated?: () => void;
};

export function createApolloLink(
  options: CreateApolloLinkOptions = {}
): ApolloLink {
  const { onUnauthenticated } = options;

  const errorLink = new ErrorLink(({ error }) => {
    if (!isUnauthenticatedError(error)) {
      return;
    }

    onUnauthenticated?.();
  });

  const authLink = new SetContextLink((prevContext) => ({
    ...prevContext,
    fetchOptions: {
      ...prevContext.fetchOptions,
      credentials: "omit",
    },
  }));

  const httpLink = new HttpLink({
    credentials: "omit",
    fetch: privilegedExtensionFetch,
    uri: getGraphqlUri(),
  });

  return ApolloLink.from([errorLink, authLink, httpLink]);
}
