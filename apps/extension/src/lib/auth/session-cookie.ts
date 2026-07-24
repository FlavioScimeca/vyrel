import { getWebBaseURL } from "@/src/lib/api-base-url";
import { authDebug, redactCookieHeader } from "@/src/lib/auth/auth-debug";
import {
  readWebSessionCookieHeader,
  removeWebSessionCookies,
} from "@/src/lib/auth/cookie-background";
import {
  EXTENSION_COOKIE_CLEAR,
  EXTENSION_COOKIE_GET,
  type ExtensionCookieClearResponse,
  type ExtensionCookieGetResponse,
} from "@/src/lib/auth/cookie-messages";
import { withTimeout } from "@/src/lib/auth/with-timeout";

const COOKIE_TIMEOUT_MS = 5000;

function canUseCookiesApiLocally(): boolean {
  if (browser.cookies !== undefined) {
    return true;
  }

  const chromeApi = (
    globalThis as typeof globalThis & {
      chrome?: { cookies?: unknown };
    }
  ).chrome?.cookies;

  return chromeApi !== undefined;
}

/**
 * Read the Vyrel web-origin session cookie.
 * Prefer local cookies API in the popup; fall back to the background bridge.
 */
export async function getWebSessionCookieHeader(): Promise<string | null> {
  const url = getWebBaseURL();
  const local = canUseCookiesApiLocally();
  authDebug("getWebSessionCookieHeader:start", {
    localCookiesApi: local,
    url,
  });

  if (local) {
    const cookieHeader = await withTimeout(
      readWebSessionCookieHeader(url),
      COOKIE_TIMEOUT_MS,
      "Timed out reading session cookie"
    );
    authDebug("getWebSessionCookieHeader:local", {
      header: redactCookieHeader(cookieHeader),
    });
    return cookieHeader;
  }

  authDebug("getWebSessionCookieHeader:background-bridge");
  const response = (await withTimeout(
    browser.runtime.sendMessage({
      type: EXTENSION_COOKIE_GET,
      url,
    }),
    COOKIE_TIMEOUT_MS,
    "Timed out waiting for background cookie bridge"
  )) as ExtensionCookieGetResponse | undefined;

  if (response === undefined) {
    throw new Error(
      "No response from background. Reload the extension at chrome://extensions."
    );
  }

  if (response.error !== undefined) {
    throw new Error(response.error);
  }

  authDebug("getWebSessionCookieHeader:background", {
    header: redactCookieHeader(response.cookieHeader),
  });
  return response.cookieHeader;
}

/** Cookie header map for authenticated fetches (mobile-style explicit Cookie). */
export async function getSessionCookieHeaders(): Promise<
  Record<string, string>
> {
  const cookie = await getWebSessionCookieHeader();
  if (cookie === null) {
    return {};
  }

  return { Cookie: cookie };
}

/** Remove the web-origin session cookie after local sign-out. */
export async function clearWebSessionCookie(): Promise<void> {
  const url = getWebBaseURL();

  if (canUseCookiesApiLocally()) {
    await withTimeout(
      removeWebSessionCookies(url),
      COOKIE_TIMEOUT_MS,
      "Timed out clearing session cookie"
    );
    return;
  }

  const response = (await withTimeout(
    browser.runtime.sendMessage({
      type: EXTENSION_COOKIE_CLEAR,
      url,
    }),
    COOKIE_TIMEOUT_MS,
    "Timed out waiting for background cookie clear"
  )) as ExtensionCookieClearResponse | undefined;

  if (response === undefined || !response.ok) {
    throw new Error(
      response?.error ??
        "Failed to clear session cookie. Reload the extension at chrome://extensions."
    );
  }
}
