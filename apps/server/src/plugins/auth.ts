import { auth } from "@vyrel/auth";
import { Elysia } from "elysia";

const authMethods = new Set(["GET", "POST"]);

/**
 * Better Auth is mounted on `/api/auth/*`. Explicit routes are registered before the
 * wildcard so Eden Treaty gets stable, typed paths for proxy/session checks.
 */
export const authPlugin = new Elysia({ name: "auth" })
  .get("/api/auth/get-session", ({ request }) =>
    auth.api.getSession({ headers: request.headers })
  )
  .get("/api/auth/organization/list", ({ request, status }) =>
    auth.api
      .listOrganizations({ headers: request.headers })
      .catch(() => status(401))
  )
  .all("/api/auth/*", ({ request, status }) => {
    if (authMethods.has(request.method)) {
      return auth.handler(request);
    }

    return status(405);
  });
