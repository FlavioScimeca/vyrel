/**
 * Extension bridge: Chrome forbids setting `Cookie` on fetch, and SameSite=Lax
 * cookies are not sent from chrome-extension:// initiators. The extension reads
 * the web-origin session cookie via `chrome.cookies` and sends it here instead.
 */
export const EXTENSION_SESSION_COOKIE_HEADER = "x-vyrel-session-cookie";

/** Copy `X-Vyrel-Session-Cookie` onto `Cookie` for Better Auth session lookup. */
export function headersWithExtensionSessionCookie(headers: Headers): Headers {
  const extensionCookie = headers.get(EXTENSION_SESSION_COOKIE_HEADER);
  if (extensionCookie === null || extensionCookie.length === 0) {
    return headers;
  }

  const next = new Headers(headers);
  next.set("cookie", extensionCookie);
  return next;
}

/** Clone a Request with extension session cookie mapped onto Cookie. */
export function requestWithExtensionSessionCookie(request: Request): Request {
  const headers = headersWithExtensionSessionCookie(request.headers);
  if (headers === request.headers) {
    return request;
  }

  return new Request(request, { headers });
}
