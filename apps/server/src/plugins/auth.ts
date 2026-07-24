import { auth } from "@vyrel/auth";
import { selectActiveOrganizationId } from "@vyrel/db/utils/membership-selection";
import { listOrganizationMembershipIdentities } from "@vyrel/db/utils/organization-memberships";
import { Effect } from "effect";
import { Elysia } from "elysia";

const authMethods = new Set(["GET", "POST"]);

/**
 * Better Auth is mounted on `/api/auth/*`. Explicit routes are registered before the
 * wildcard so internal consumers get stable, typed auth/bootstrap paths.
 */
export const authPlugin = new Elysia({ name: "auth" })
  .post("/api/auth/bootstrap", ({ request, status }) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const authSession = yield* Effect.tryPromise(() =>
          auth.api.getSession({
            headers: request.headers,
          })
        );

        if (authSession === null) {
          return status(401, { message: "Unauthorized" });
        }

        const memberships = yield* listOrganizationMembershipIdentities(
          authSession.user.id
        );
        const currentActiveOrganizationId =
          authSession.session.activeOrganizationId ?? null;
        const activeOrganizationId = selectActiveOrganizationId(
          memberships,
          currentActiveOrganizationId
        );

        if (activeOrganizationId !== currentActiveOrganizationId) {
          yield* Effect.tryPromise(() =>
            auth.api.setActiveOrganization({
              body: { organizationId: activeOrganizationId },
              headers: request.headers,
            })
          );
        }

        return {
          activeOrganizationId,
          hasOrganizationAccess: memberships.length > 0,
          session: {
            id: authSession.session.id,
          },
          user: {
            id: authSession.user.id,
          },
        };
      }).pipe(
        Effect.catchAll(() =>
          Effect.succeed(
            status(503, {
              message: "Authentication bootstrap is temporarily unavailable",
            })
          )
        )
      )
    )
  )
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
