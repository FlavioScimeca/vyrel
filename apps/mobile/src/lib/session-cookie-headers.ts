import { authClient } from "@/lib/auth-client";

/** Cookie header for authenticated fetches (Better Auth Expo SecureStore). */
export function getSessionCookieHeaders(): Record<string, string> {
  const cookies = authClient.getCookie();
  if (cookies === undefined || cookies.length === 0) {
    return {};
  }

  return { Cookie: cookies };
}
