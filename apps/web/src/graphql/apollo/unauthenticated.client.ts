const AUTH_PATH = "/auth";

const isAuthPath = (pathname: string): boolean =>
  pathname === AUTH_PATH || pathname.startsWith(`${AUTH_PATH}/`);

export function getAuthRedirectHref(
  pathname: string,
  search: string,
  hash: string
): string | undefined {
  if (isAuthPath(pathname)) {
    return;
  }

  const params = new URLSearchParams({ next: `${pathname}${search}${hash}` });
  return `${AUTH_PATH}?${params.toString()}`;
}

/** Client-side redirect when GraphQL returns UNAUTHENTICATED. */
export function handleClientUnauthenticated(): void {
  if (typeof window === "undefined") {
    return;
  }

  const redirectHref = getAuthRedirectHref(
    window.location.pathname,
    window.location.search,
    window.location.hash
  );
  if (redirectHref === undefined) {
    return;
  }

  window.location.assign(redirectHref);
}
