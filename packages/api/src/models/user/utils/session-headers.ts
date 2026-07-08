const SET_COOKIE_NAME_VALUE_PATTERN = /^[^=]+=[^;]*/;

export function readSetCookieHeaders(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single === null ? [] : [single];
}

export function mergeSessionHeaders(
  requestHeaders: Headers,
  setCookies: string[]
): Headers {
  const headers = new Headers(requestHeaders);
  const cookieValues = setCookies
    .map((entry) => SET_COOKIE_NAME_VALUE_PATTERN.exec(entry)?.[0])
    .filter((value): value is string => value !== undefined);

  if (cookieValues.length === 0) {
    return headers;
  }

  const existingCookie = headers.get("cookie");
  const mergedCookie =
    existingCookie === null
      ? cookieValues.join("; ")
      : `${existingCookie}; ${cookieValues.join("; ")}`;

  headers.set("cookie", mergedCookie);
  return headers;
}
