import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasSessionCookie, resolveOrganizationAccess } from "@/lib/proxy-auth";
import {
  defaultRouteForOrganization,
  isBackendApiRoute,
  isOnboardingRoute,
  isPublicRoute,
  shouldBypassAuthGuard,
} from "@/lib/proxy-routes";

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToAuth(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!hasSessionCookie(request)) {
    if (shouldBypassAuthGuard(pathname)) {
      return NextResponse.next();
    }

    return redirectToAuth(request);
  }

  if (isBackendApiRoute(pathname)) {
    return NextResponse.next();
  }

  const { hasOrganizationAccess, isAuthenticated } =
    await resolveOrganizationAccess(request);

  if (!isAuthenticated) {
    if (shouldBypassAuthGuard(pathname)) {
      return NextResponse.next();
    }

    return redirectToAuth(request);
  }

  if (isPublicRoute(pathname)) {
    return redirect(
      request,
      defaultRouteForOrganization(hasOrganizationAccess)
    );
  }

  if (isOnboardingRoute(pathname)) {
    if (hasOrganizationAccess) {
      return redirect(request, "/dashboard");
    }

    return NextResponse.next();
  }

  if (!hasOrganizationAccess) {
    return redirect(request, "/onboarding");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
