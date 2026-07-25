import { useCallback, useEffect, useState } from "react";

import { getWebBaseURL, getWebSignInUrl } from "@/src/lib/api-base-url";
import { authClient } from "@/src/lib/auth/auth-client";
import { authDebug, redactCookieHeader } from "@/src/lib/auth/auth-debug";
import {
  clearWebSessionCookie,
  getWebSessionCookieHeader,
} from "@/src/lib/auth/session-cookie";
import { withTimeout } from "@/src/lib/auth/with-timeout";

const SESSION_CHECK_TIMEOUT_MS = 8000;

export type ExtensionSessionState =
  | { status: "checking" }
  | { status: "signed-out"; error: string | null }
  | { status: "signed-in"; webOrigin: string };

/**
 * Silent login = web-origin Better Auth cookie present.
 * We do not call get-session for the gate: popup/SW cannot reliably forward
 * Cookie to the API, and cookie presence is enough to unlock extension UI.
 * GraphQL still authenticates via the privileged fetch bridge when used.
 */
async function verifySession(): Promise<ExtensionSessionState> {
  const webOrigin = getWebBaseURL();
  authDebug("verifySession:start", {
    webOrigin,
    webSignInUrl: getWebSignInUrl(),
  });

  const cookie = await getWebSessionCookieHeader();
  authDebug("verifySession:cookie", {
    found: cookie !== null,
    header: redactCookieHeader(cookie),
  });

  if (cookie === null) {
    authDebug("verifySession:no-cookie → signed-out");
    return { error: null, status: "signed-out" };
  }

  authDebug("verifySession:cookie-present → signed-in (no server round-trip)");
  return { status: "signed-in", webOrigin };
}

export function useExtensionSession() {
  const [state, setState] = useState<ExtensionSessionState>({
    status: "checking",
  });

  const checkSession = useCallback(async () => {
    authDebug("checkSession:start");
    setState({ status: "checking" });

    try {
      const nextState = await withTimeout(
        verifySession(),
        SESSION_CHECK_TIMEOUT_MS,
        "Session check timed out while reading browser cookies."
      );
      authDebug("checkSession:done", { status: nextState.status });
      setState(nextState);
    } catch (sessionError) {
      authDebug("checkSession:error", sessionError);
      setState({
        error:
          sessionError instanceof Error
            ? sessionError.message
            : "Failed to check session",
        status: "signed-out",
      });
    }
  }, []);

  useEffect(() => {
    checkSession().catch(() => undefined);
  }, [checkSession]);

  const openWebSignIn = useCallback(async () => {
    const url = getWebSignInUrl();
    authDebug("openWebSignIn", { url });
    await browser.tabs.create({ url });
  }, []);

  const signOut = useCallback(async () => {
    authDebug("signOut:start");
    // Gate is cookie-based: clear local cookie + UI first. Server revoke is best-effort.
    try {
      await clearWebSessionCookie();
      authDebug("signOut:cookie-cleared");
    } catch (clearError) {
      authDebug("signOut:clear-cookie-error", clearError);
    }

    setState({ error: null, status: "signed-out" });

    withTimeout(authClient.signOut(), 5000)
      .then(() => {
        authDebug("signOut:api-ok");
      })
      .catch((signOutError: unknown) => {
        authDebug("signOut:api-error (ignored)", signOutError);
      });
  }, []);

  return {
    checkSession,
    openWebSignIn,
    signOut,
    state,
  };
}
