import type { Href } from "expo-router";

export const AUTH_SIGN_IN = "/sign-in" as const;
export const AUTH_SIGN_UP = "/sign-up" as const;
export const AUTH_RESET_PASSWORD = "/reset-password" as const;
export const ONBOARDING = "/onboarding" as const;
export const APP_HOME = "/home" as const;
export const APP_USER = "/more/user" as const;
export const APP_ORGANIZATION = "/more/organization" as const;

export function defaultRouteForOrganization(hasOrganization: boolean): Href {
  return hasOrganization ? APP_HOME : ONBOARDING;
}
