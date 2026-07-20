import { ApolloLink } from "@apollo/client/link";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { PersistedQueryLink } from "@apollo/client/link/persisted-queries";
import UploadHttpLink from "apollo-upload-client/UploadHttpLink.mjs";

import { getGraphqlUri } from "@/lib/web-api-base-url";
import { sha256 } from "./sha256";
import { isUnauthenticatedError } from "./unauthenticated";

export type CreateApolloLinkOptions = {
  getExtraHeaders?: () =>
    | Record<string, string>
    | Promise<Record<string, string>>;
  onUnauthenticated?: () => void;
};

/**
 * Apollo link chain: error handling → auth headers → APQ → multipart upload HTTP.
 * Cookies are always sent (`credentials: "include"`). Callers may add Bearer JWT headers.
 */
export function createApolloLink(
  options: CreateApolloLinkOptions = {}
): ApolloLink {
  const { getExtraHeaders, onUnauthenticated } = options;

  const errorLink = new ErrorLink(({ error }) => {
    if (!isUnauthenticatedError(error)) {
      return;
    }

    onUnauthenticated?.();
  });

  const authLink = new SetContextLink(async (prevContext) => {
    const extraHeaders = getExtraHeaders ? await getExtraHeaders() : {};

    return {
      ...prevContext,
      fetchOptions: {
        ...prevContext.fetchOptions,
        credentials: "include",
      },
      headers: {
        ...prevContext.headers,
        ...extraHeaders,
      },
    };
  });

  const persistedQueryLink = new PersistedQueryLink({
    sha256,
  });

  const uploadLink = new UploadHttpLink({
    fetchOptions: {
      credentials: "include",
    },
    uri: getGraphqlUri(),
  });

  return ApolloLink.from([errorLink, authLink, persistedQueryLink, uploadLink]);
}
