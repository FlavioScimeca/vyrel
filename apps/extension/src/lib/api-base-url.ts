import { env } from "@vyrel/env/extension";

const TRAILING_SLASH = /\/$/;

/** Direct API origin for the extension (no Next rewrite proxy). */
export function getApiBaseURL(): string {
  return env.WXT_PUBLIC_SERVER_URL.replace(TRAILING_SLASH, "");
}

/** Web app origin — hosts the Better Auth session cookie via Next rewrites. */
export function getWebBaseURL(): string {
  return env.WXT_PUBLIC_WEB_URL.replace(TRAILING_SLASH, "");
}

export function getGraphqlUri(): string {
  return `${getApiBaseURL()}/api/graphql`;
}

export function getWebSignInUrl(): string {
  return `${getWebBaseURL()}/auth?next=/auth-succeeded`;
}
