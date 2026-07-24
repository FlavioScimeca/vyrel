const AUTH_ROUTE_PREFIX = "/auth";
const AUTH_SUCCEEDED_ROUTE = "/auth-succeeded";
const AUTH_API_ROUTE_PREFIX = "/api/auth";
const GRAPHQL_API_ROUTE = "/api/graphql";
const USER_CREATE_API_ROUTE = "/api/users";
const ORGANIZATION_CREATE_API_ROUTE = "/api/organizations";
const ONBOARDING_ROUTE = "/onboarding";
const DEFAULT_APP_ROUTE = "/dashboard";

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)
  );
}

function isAuthApiRoute(pathname: string): boolean {
  return (
    pathname === AUTH_API_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_API_ROUTE_PREFIX}/`)
  );
}

function isGraphqlApiRoute(pathname: string): boolean {
  return pathname === GRAPHQL_API_ROUTE;
}

function isUserCreateApiRoute(pathname: string): boolean {
  return pathname === USER_CREATE_API_ROUTE;
}

function isOrganizationCreateApiRoute(pathname: string): boolean {
  return pathname === ORGANIZATION_CREATE_API_ROUTE;
}

/** API routes that must reach the backend even without organization membership. */
export function isBackendApiRoute(pathname: string): boolean {
  return (
    isAuthApiRoute(pathname) ||
    isGraphqlApiRoute(pathname) ||
    isUserCreateApiRoute(pathname) ||
    isOrganizationCreateApiRoute(pathname)
  );
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}

export function isAuthSucceededRoute(pathname: string): boolean {
  return pathname === AUTH_SUCCEEDED_ROUTE;
}

export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" || isAuthRoute(pathname) || isAuthSucceededRoute(pathname)
  );
}

export function shouldBypassAuthGuard(pathname: string): boolean {
  return isPublicRoute(pathname) || isBackendApiRoute(pathname);
}

export function defaultRouteForOrganization(hasOrganization: boolean): string {
  return hasOrganization ? DEFAULT_APP_ROUTE : ONBOARDING_ROUTE;
}
