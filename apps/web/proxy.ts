import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { hasSessionCookie } from "@/lib/proxy-auth";
import { isBackendApiRoute, shouldBypassAuthGuard } from "@/lib/proxy-routes";

function redirect(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectToAuth(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBackendApiRoute(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    if (shouldBypassAuthGuard(pathname)) {
      return NextResponse.next();
    }

    return redirectToAuth(request);
  }

  if (pathname === "/") {
    return redirect(request, "/dashboard");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
