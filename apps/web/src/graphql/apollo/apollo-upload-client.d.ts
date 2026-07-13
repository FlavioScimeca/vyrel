declare module "apollo-upload-client/UploadHttpLink.mjs" {
  import type { ApolloLink } from "@apollo/client/link";

  export interface UploadHttpLinkOptions {
    credentials?: RequestCredentials;
    fetch?: typeof fetch;
    fetchOptions?: RequestInit;
    headers?: Record<string, string>;
    includeExtensions?: boolean;
    uri?: string;
  }

  export default class UploadHttpLink extends ApolloLink {
    constructor(options?: UploadHttpLinkOptions);
  }
}
