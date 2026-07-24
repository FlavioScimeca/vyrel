const DEBUG_PREFIX = "[vyrel-extension:auth]";

/** Temporary debug logging for silent-auth diagnosis (popup DevTools). */
export function authDebug(message: string, details?: unknown): void {
  if (details === undefined) {
    console.log(DEBUG_PREFIX, message);
    return;
  }

  console.log(DEBUG_PREFIX, message, details);
}

export function redactCookieHeader(cookieHeader: string | null): string | null {
  if (cookieHeader === null) {
    return null;
  }

  const eq = cookieHeader.indexOf("=");
  if (eq === -1) {
    return "<invalid-cookie-header>";
  }

  const name = cookieHeader.slice(0, eq);
  const value = cookieHeader.slice(eq + 1);
  const preview =
    value.length <= 8 ? "***" : `${value.slice(0, 4)}…${value.slice(-4)}`;

  return `${name}=${preview} (len=${value.length})`;
}
