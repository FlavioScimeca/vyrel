import { env } from "@vyrel/env/web";

const TRAILING_SLASH = /\/$/;

/** Browser calls stay same-origin so Better Auth cookies attach to the web app. */
export function getWebApiBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return env.NEXT_PUBLIC_SERVER_URL;
}

/** GraphQL endpoint — same-origin in the browser, direct API URL on the server. */
export function getGraphqlUri(): string {
  return `${getWebApiBaseURL().replace(TRAILING_SLASH, "")}/api/graphql`;
}
