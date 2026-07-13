const AUTH_ROUTE_PREFIX = "/auth";
const ONBOARDING_ROUTE = "/onboarding";
const DEFAULT_APP_ROUTE = "/dashboard";

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)
  );
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}

export function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || isAuthRoute(pathname);
}

/** Any app route outside public pages and onboarding (i.e. under `(authenticated)`). */
function _isAuthenticatedRoute(pathname: string): boolean {
  return !(isPublicRoute(pathname) || isOnboardingRoute(pathname));
}

export function defaultRouteForOrganization(hasOrganization: boolean): string {
  return hasOrganization ? DEFAULT_APP_ROUTE : ONBOARDING_ROUTE;
}
