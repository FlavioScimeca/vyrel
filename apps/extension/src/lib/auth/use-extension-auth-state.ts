import { useCallback, useEffect, useState } from "react";

import { getActiveOrganizationId } from "@/src/lib/active-organization";
import { getApiBaseURL } from "@/src/lib/api-base-url";
import { authDebug } from "@/src/lib/auth/auth-debug";
import { privilegedExtensionFetch } from "@/src/lib/auth/privileged-fetch";
import { getWebSessionCookieHeader } from "@/src/lib/auth/session-cookie";
import { withTimeout } from "@/src/lib/auth/with-timeout";

const LOAD_TIMEOUT_MS = 10_000;

export type ExtensionSessionPayload = {
  session: {
    activeOrganizationId?: string | null;
    id: string;
  };
  user: {
    id: string;
  };
};

export type ExtensionAuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | {
      status: "signed-in";
      organizationId: string | null;
      session: ExtensionSessionPayload;
    }
  | { status: "error"; message: string };

/**
 * Cookie gate + explicit get-session via privileged fetch.
 * Avoids better-auth useSession quirks in extension pages.
 */
export function useExtensionAuthState() {
  const [state, setState] = useState<ExtensionAuthState>({ status: "loading" });

  const reload = useCallback(async () => {
    setState({ status: "loading" });
    authDebug("useExtensionAuthState:reload");

    try {
      const cookie = await getWebSessionCookieHeader();
      authDebug("useExtensionAuthState:cookie", { found: cookie !== null });

      if (cookie === null) {
        setState({ status: "signed-out" });
        return;
      }

      const response = await withTimeout(
        privilegedExtensionFetch(`${getApiBaseURL()}/api/auth/get-session`, {
          method: "GET",
        }),
        LOAD_TIMEOUT_MS,
        "Timed out loading session"
      );

      const text = await response.text();
      authDebug("useExtensionAuthState:get-session", {
        bodyPreview: text.slice(0, 400),
        ok: response.ok,
        status: response.status,
      });

      if (!response.ok || text.length === 0 || text === "null") {
        setState({
          message:
            "Session cookie found, but get-session returned no user. Try signing in again on the web app.",
          status: "error",
        });
        return;
      }

      const data = JSON.parse(text) as ExtensionSessionPayload;
      if (
        data === null ||
        typeof data !== "object" ||
        data.session === undefined ||
        data.user === undefined
      ) {
        setState({
          message: "Unexpected get-session payload.",
          status: "error",
        });
        return;
      }

      setState({
        organizationId: getActiveOrganizationId(data),
        session: data,
        status: "signed-in",
      });
    } catch (loadError) {
      authDebug("useExtensionAuthState:error", loadError);
      setState({
        message:
          loadError instanceof Error
            ? loadError.message
            : "Failed to load session",
        status: "error",
      });
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  return { reload, state };
}
