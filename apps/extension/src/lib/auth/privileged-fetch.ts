import { authDebug } from "@/src/lib/auth/auth-debug";
import {
  EXTENSION_PRIVILEGED_FETCH,
  type ExtensionPrivilegedFetchResponse,
} from "@/src/lib/auth/cookie-messages";
import { withTimeout } from "@/src/lib/auth/with-timeout";

const FETCH_TIMEOUT_MS = 8000;

/**
 * Popup/extension-page fetch cannot send Cookie (forbidden header).
 * Background SW attaches the web-origin session cookie and performs the request.
 */
export async function privilegedExtensionFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  const method = init?.method ?? "GET";
  const headerRecord: Record<string, string> = {};

  if (init?.headers !== undefined) {
    new Headers(init.headers).forEach((value, key) => {
      if (key.toLowerCase() === "cookie") {
        return;
      }
      headerRecord[key] = value;
    });
  }

  let body: string | null = null;
  if (init?.body !== undefined && init.body !== null) {
    if (typeof init.body === "string") {
      body = init.body;
    } else {
      body = await new Response(init.body).text();
    }
  }

  authDebug("privilegedExtensionFetch:request", { method, url });

  const result = (await withTimeout(
    browser.runtime.sendMessage({
      body,
      headers: headerRecord,
      method,
      type: EXTENSION_PRIVILEGED_FETCH,
      url,
    }),
    FETCH_TIMEOUT_MS,
    "Timed out waiting for background API fetch"
  )) as ExtensionPrivilegedFetchResponse | undefined;

  if (result === undefined) {
    throw new Error(
      "No response from background fetch. Reload the extension at chrome://extensions."
    );
  }

  if (result.error !== undefined && result.status === 0) {
    throw new Error(result.error);
  }

  authDebug("privilegedExtensionFetch:response", {
    bodyPreview: result.body.slice(0, 300),
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
