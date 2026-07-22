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

const isProduction = process.env.NODE_ENV === "production";

/** True when GraphQL variables include a browser file upload payload. */
function hasUploadVariables(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof File !== "undefined" && value instanceof File) {
    return true;
  }

  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return true;
  }

  if (typeof FileList !== "undefined" && value instanceof FileList) {
    return value.length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(hasUploadVariables);
  }

  if (typeof value === "object") {
    return Object.values(value).some(hasUploadVariables);
  }

  return false;
}

/**
 * Apollo link chain: error handling → auth headers → optional APQ → multipart upload HTTP.
 * Cookies are always sent (`credentials: "include"`). Callers may add extra headers.
 *
 * APQ is enabled only in production, and skipped for operations that include file uploads
 * (multipart + APQ miss would upload the file twice).
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

  const uploadLink = new UploadHttpLink({
    fetchOptions: {
      credentials: "include",
    },
    uri: getGraphqlUri(),
  });

  if (!isProduction) {
    return ApolloLink.from([errorLink, authLink, uploadLink]);
  }

  const persistedQueryLink = new PersistedQueryLink({
    sha256,
  });

  const httpWithOptionalApq = ApolloLink.split(
    (operation) => hasUploadVariables(operation.variables),
    uploadLink,
    ApolloLink.from([persistedQueryLink, uploadLink])
  );

  return ApolloLink.from([errorLink, authLink, httpWithOptionalApq]);
}
