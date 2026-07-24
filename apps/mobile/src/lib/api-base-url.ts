import { env } from "@vyrel/env/native";

const TRAILING_SLASH = /\/$/;

/** Direct API origin for the Expo app (no Next rewrite proxy). */
export function getApiBaseURL(): string {
  return env.EXPO_PUBLIC_SERVER_URL.replace(TRAILING_SLASH, "");
}

export function getGraphqlUri(): string {
  return `${getApiBaseURL()}/api/graphql`;
}
