import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  fetchHasOrganizationMembership,
  isRequestAuthenticated,
} from "@/lib/proxy-auth";
import {
  defaultRouteForOrganization,
  isOnboardingRoute,
  isPublicRoute,
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

  const isAuthenticated = await isRequestAuthenticated(request);

  if (!isAuthenticated) {
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    return redirectToAuth(request);
  }

  const hasOrganization = await fetchHasOrganizationMembership(request);

  if (hasOrganization === null) {
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    return redirectToAuth(request);
  }

  if (isPublicRoute(pathname)) {
    return redirect(request, defaultRouteForOrganization(hasOrganization));
  }

  if (isOnboardingRoute(pathname)) {
    if (hasOrganization) {
      return redirect(request, "/dashboard");
    }

    return NextResponse.next();
  }

  if (!hasOrganization) {
    return redirect(request, "/onboarding");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
