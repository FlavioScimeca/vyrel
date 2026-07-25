import { authDebug, redactCookieHeader } from "@/src/lib/auth/auth-debug";
import {
  EXTENSION_PRIVILEGED_FETCH,
  EXTENSION_SESSION_COOKIE_HEADER,
  type ExtensionPrivilegedFetchResponse,
} from "@/src/lib/auth/cookie-messages";
import { getWebSessionCookieHeader } from "@/src/lib/auth/session-cookie";
import { withTimeout } from "@/src/lib/auth/with-timeout";

const FETCH_TIMEOUT_MS = 8000;

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  if (input instanceof Request) {
    return input.url;
  }
  return String(input);
}

function resolveRequestMethod(
  input: RequestInfo | URL,
  init?: RequestInit
): string {
  if (init?.method !== undefined) {
    return init.method;
  }
  if (input instanceof Request) {
    return input.method;
  }
  return "GET";
}

async function resolveRequestBody(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<BodyInit | null | undefined> {
  if (init?.body !== undefined) {
    return init.body;
  }
  if (input instanceof Request) {
    return input.body;
  }
}

function mergeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers();
  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  if (init?.headers !== undefined) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  headers.delete("cookie");
  return headers;
}

/**
 * Authenticated fetch for the extension.
 * Attaches the web session as `X-Vyrel-Session-Cookie` (server maps it to Cookie).
 * Prefers a direct fetch from the extension page (host_permissions bypass CORS);
 * falls back to the background SW when the cookies API is unavailable here.
 */
export async function privilegedExtensionFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = resolveRequestUrl(input);
  const method = resolveRequestMethod(input, init);
  const headers = mergeHeaders(input, init);
  const body = await resolveRequestBody(input, init);

  let cookieHeader: string | null = null;
  try {
    cookieHeader = await getWebSessionCookieHeader();
  } catch (cookieError) {
    authDebug("privilegedExtensionFetch:cookie-read-error", cookieError);
  }

  if (cookieHeader !== null) {
    headers.set(EXTENSION_SESSION_COOKIE_HEADER, cookieHeader);
  }

  authDebug("privilegedExtensionFetch:request", {
    cookie: redactCookieHeader(cookieHeader),
    cookiePresent: cookieHeader !== null,
    method,
    mode: "direct",
    url,
  });

  try {
    const response = await fetch(url, {
      body: body ?? undefined,
      credentials: "omit",
      headers,
      method,
    });

    authDebug("privilegedExtensionFetch:response", {
      ok: response.ok,
      status: response.status,
      url: response.url,
    });

    return response;
  } catch (directError) {
    authDebug(
      "privilegedExtensionFetch:direct-failed → background",
      directError
    );
    return privilegedFetchViaBackground(url, method, headers, body);
  }
}

async function privilegedFetchViaBackground(
  url: string,
  method: string,
  headers: Headers,
  body: BodyInit | null | undefined
): Promise<Response> {
  const headerRecord: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerRecord[key] = value;
  });

  let bodyText: string | null = null;
  if (body !== undefined && body !== null) {
    bodyText =
      typeof body === "string" ? body : await new Response(body).text();
  }

  authDebug("privilegedExtensionFetch:background-request", { method, url });

  const result = (await withTimeout(
    browser.runtime.sendMessage({
      body: bodyText,
      headers: headerRecord,
      method,
      type: EXTENSION_PRIVILEGED_FETCH,
      url,
    }),
    FETCH_TIMEOUT_MS,
    "Timed out waiting for background API fetch"
  )) as ExtensionPrivilegedFetchResponse | undefined;

  if (result === undefined) {
    authDebug("privilegedExtensionFetch:no-response", { method, url });
    throw new Error(
      "No response from background fetch. Reload the extension at chrome://extensions."
    );
  }

  if (result.error !== undefined && result.status === 0) {
    authDebug("privilegedExtensionFetch:error", {
      error: result.error,
      method,
      url,
    });
    throw new Error(result.error);
  }

  authDebug("privilegedExtensionFetch:background-response", {
    bodyLength: result.body.length,
    bodyPreview: result.body.slice(0, 400),
    ok: result.ok,
    status: result.status,
    url: result.url,
  });

  return new Response(result.body, {
    headers: result.headers,
    status: result.status,
    statusText: result.statusText,
  });
}
