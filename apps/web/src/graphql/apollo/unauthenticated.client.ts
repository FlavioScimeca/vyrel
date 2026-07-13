const AUTH_PATH = "/auth";

/** Client-side redirect when GraphQL returns UNAUTHENTICATED. */
export function handleClientUnauthenticated(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname.startsWith(AUTH_PATH)) {
    return;
  }

  window.location.assign(AUTH_PATH);
}
