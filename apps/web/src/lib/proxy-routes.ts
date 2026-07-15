const AUTH_ROUTE_PREFIX = "/auth";
const AUTH_API_ROUTE_PREFIX = "/api/auth";
const USER_CREATE_API_ROUTE = "/api/users";
const ONBOARDING_ROUTE = "/onboarding";
const DEFAULT_APP_ROUTE = "/dashboard";

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)
  );
}

export function isAuthApiRoute(pathname: string): boolean {
  return (
    pathname === AUTH_API_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_API_ROUTE_PREFIX}/`)
  );
}

function isUserCreateApiRoute(pathname: string): boolean {
  return pathname === USER_CREATE_API_ROUTE;
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}

export function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || isAuthRoute(pathname);
}

export function shouldBypassAuthGuard(pathname: string): boolean {
  return (
    isPublicRoute(pathname) ||
    isAuthApiRoute(pathname) ||
    isUserCreateApiRoute(pathname)
  );
}

export function defaultRouteForOrganization(hasOrganization: boolean): string {
  return hasOrganization ? DEFAULT_APP_ROUTE : ONBOARDING_ROUTE;
}
