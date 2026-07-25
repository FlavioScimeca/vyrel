/** Message types for background cookie + privileged fetch bridge. */
export const EXTENSION_COOKIE_GET = "vyrel:cookie-get" as const;
export const EXTENSION_COOKIE_CLEAR = "vyrel:cookie-clear" as const;
export const EXTENSION_PRIVILEGED_FETCH = "vyrel:privileged-fetch" as const;

/** Custom header: extension forwards web session cookie (Chrome forbids Cookie). */
export const EXTENSION_SESSION_COOKIE_HEADER = "X-Vyrel-Session-Cookie";

export type ExtensionCookieGetMessage = {
  type: typeof EXTENSION_COOKIE_GET;
  url: string;
};

export type ExtensionCookieClearMessage = {
  type: typeof EXTENSION_COOKIE_CLEAR;
  url: string;
};

export type ExtensionPrivilegedFetchMessage = {
  type: typeof EXTENSION_PRIVILEGED_FETCH;
  body?: string | null;
  headers?: Record<string, string>;
  method?: string;
  url: string;
};

export type ExtensionCookieMessage =
  | ExtensionCookieGetMessage
  | ExtensionCookieClearMessage
  | ExtensionPrivilegedFetchMessage;

export type ExtensionCookieGetResponse = {
  cookieHeader: string | null;
  error?: string;
};

export type ExtensionCookieClearResponse = {
  ok: boolean;
  error?: string;
};

export type ExtensionPrivilegedFetchResponse = {
  body: string;
  error?: string;
  headers: Record<string, string>;
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
};
