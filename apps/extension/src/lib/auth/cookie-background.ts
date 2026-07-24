import { getWebBaseURL } from "@/src/lib/api-base-url";
import { authDebug, redactCookieHeader } from "@/src/lib/auth/auth-debug";
import {
  EXTENSION_COOKIE_CLEAR,
  EXTENSION_COOKIE_GET,
  EXTENSION_PRIVILEGED_FETCH,
  type ExtensionCookieMessage,
  type ExtensionPrivilegedFetchMessage,
  type ExtensionPrivilegedFetchResponse,
} from "@/src/lib/auth/cookie-messages";

/** Better Auth session cookie base name (without the `__Secure-` production prefix). */
export const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = `__Secure-${BETTER_AUTH_SESSION_COOKIE}`;

function getCookiesApi(): typeof browser.cookies {
  const fromBrowser = browser.cookies;
  if (fromBrowser !== undefined) {
    return fromBrowser;
  }

  const chromeApi = (
    globalThis as typeof globalThis & {
      chrome?: { cookies?: typeof browser.cookies };
    }
  ).chrome?.cookies;

  if (chromeApi === undefined) {
    throw new Error(
      "Cookies API unavailable. Reload the extension at chrome://extensions so the cookies permission is applied."
    );
  }

  return chromeApi;
}

/** Resolve session cookie header from the web origin. */
export async function readWebSessionCookieHeader(
  url: string
): Promise<string | null> {
  const cookiesApi = getCookiesApi();
  const [secureCookie, sessionCookie] = await Promise.all([
    cookiesApi.get({ name: SECURE_SESSION_COOKIE, url }),
    cookiesApi.get({ name: BETTER_AUTH_SESSION_COOKIE, url }),
  ]);

  const cookie = secureCookie ?? sessionCookie;
  if (cookie != null && cookie.value.length > 0) {
    return `${cookie.name}=${cookie.value}`;
  }

  const matching = await cookiesApi.getAll({ url });
  const fallback = matching.find(
    (entry) =>
      entry.name === BETTER_AUTH_SESSION_COOKIE ||
      entry.name === SECURE_SESSION_COOKIE
  );

  if (fallback === undefined || fallback.value.length === 0) {
    return null;
  }

  return `${fallback.name}=${fallback.value}`;
}

function sessionCookieNames(): Set<string> {
  return new Set([BETTER_AUTH_SESSION_COOKIE, SECURE_SESSION_COOKIE]);
}

/** Build a url `cookies.remove` accepts for a stored cookie. */
function urlForCookie(cookie: Browser.cookies.Cookie): string {
  const protocol = cookie.secure ? "https:" : "http:";
  const host = cookie.domain.startsWith(".")
    ? cookie.domain.slice(1)
    : cookie.domain;
  const path = cookie.path.length > 0 ? cookie.path : "/";
  return `${protocol}//${host}${path}`;
}

export async function removeWebSessionCookies(url: string): Promise<void> {
  const cookiesApi = getCookiesApi();
  const names = sessionCookieNames();

  // Prefer remove-by-discovered cookies (correct path/domain), not only base URL.
  const discovered = await cookiesApi.getAll({ url });
  const targets = discovered.filter((cookie) => names.has(cookie.name));

  authDebug("removeWebSessionCookies:discovered", {
    count: targets.length,
    names: targets.map((cookie) => cookie.name),
    paths: targets.map((cookie) => cookie.path),
    url,
  });

  if (targets.length === 0) {
    await Promise.all([
      cookiesApi.remove({ name: SECURE_SESSION_COOKIE, url }),
      cookiesApi.remove({ name: BETTER_AUTH_SESSION_COOKIE, url }),
    ]);
    return;
  }

  const removed = await Promise.all(
    targets.map(async (cookie) => {
      const removeUrl = urlForCookie(cookie);
      const details = await cookiesApi.remove({
        name: cookie.name,
        url: removeUrl,
      });
      return { details, name: cookie.name, removeUrl };
    })
  );

  authDebug("removeWebSessionCookies:removed", removed);
}

/**
 * Popup fetch strips the Cookie header (forbidden). Background SW can attach
 * the web-origin session cookie when calling the API.
 */
export async function privilegedFetch(
  message: ExtensionPrivilegedFetchMessage
): Promise<ExtensionPrivilegedFetchResponse> {
  const cookieHeader = await readWebSessionCookieHeader(getWebBaseURL());
  const headers = new Headers(message.headers);

  if (cookieHeader !== null) {
    headers.set("Cookie", cookieHeader);
  }

  authDebug("privilegedFetch:request", {
    cookie: redactCookieHeader(cookieHeader),
    hasCookieHeader: cookieHeader !== null,
    method: message.method ?? "GET",
    url: message.url,
  });

  const response = await fetch(message.url, {
    body: message.body ?? undefined,
    credentials: "omit",
    headers,
    method: message.method ?? "GET",
  });

  const body = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  authDebug("privilegedFetch:response", {
    bodyPreview: body.slice(0, 300),
    ok: response.ok,
    status: response.status,
    url: response.url,
  });

  return {
    body,
    headers: responseHeaders,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
  };
}

/**
 * WXT/`browser` uses webextension-polyfill: async replies must be Promises
 * returned from the listener (not chrome-style sendResponse + return true).
 */
export function registerCookieMessageHandlers(): void {
  browser.runtime.onMessage.addListener((message: ExtensionCookieMessage) => {
    if (message.type === EXTENSION_COOKIE_GET) {
      return readWebSessionCookieHeader(message.url)
        .then((cookieHeader) => ({ cookieHeader }))
        .catch((error: unknown) => ({
          cookieHeader: null as string | null,
          error:
            error instanceof Error
              ? error.message
              : "Failed to read session cookie",
        }));
    }

    if (message.type === EXTENSION_COOKIE_CLEAR) {
      return removeWebSessionCookies(message.url)
        .then(() => ({ ok: true as const }))
        .catch((error: unknown) => ({
          error:
            error instanceof Error
              ? error.message
              : "Failed to clear session cookie",
          ok: false as const,
        }));
    }

    if (message.type === EXTENSION_PRIVILEGED_FETCH) {
      return privilegedFetch(message).catch((error: unknown) => ({
        body: "",
        error:
          error instanceof Error ? error.message : "Privileged fetch failed",
        headers: {},
        ok: false,
        status: 0,
        statusText: "Error",
        url: message.url,
      }));
    }
  });
}
