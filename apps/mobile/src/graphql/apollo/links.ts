import { ApolloLink } from "@apollo/client/link";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { HttpLink } from "@apollo/client/link/http";

import { getGraphqlUri } from "@/lib/api-base-url";
import { getSessionCookieHeaders } from "@/lib/session-cookie-headers";
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
    headers: {
      ...prevContext.headers,
      ...getSessionCookieHeaders(),
    },
  }));

  // Prefer Apollo HttpLink on RN — apollo-upload-client's .mjs entry breaks Metro/Hermes.
  const httpLink = new HttpLink({
    credentials: "omit",
    uri: getGraphqlUri(),
  });

  return ApolloLink.from([errorLink, authLink, httpLink]);
}
