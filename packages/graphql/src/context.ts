import { auth } from "@vyrel/auth";
import type { AuthClaims } from "@vyrel/auth/lib/verify-bearer";
import { verifyBearer } from "@vyrel/auth/lib/verify-bearer";
import type { Session, User } from "better-auth";

export type GraphQLSession = { user: User; session: Session } | null;

/** Yoga / Pothos request context. */
export interface GraphQLContext {
  headers: Headers;
  isAuthenticated: boolean;
  session: GraphQLSession;
  user?: AuthClaims;
}

/** Authenticated user id from session cookie or Bearer JWT. */
export function resolveActorUserId(
  context: GraphQLContext
): string | undefined {
  return context.session?.user.id ?? context.user?.id;
}

/** Yoga context factory must return a Promise; keep the boundary Promise-based. */
export const createGraphqlContext = (
  request: Request
): Promise<GraphQLContext> =>
  Promise.all([
    auth.api.getSession({ headers: request.headers }),
    verifyBearer(request.headers),
  ]).then(([session, user]) => {
    const isAuthenticated = session !== null || user !== undefined;

    return {
      headers: request.headers,
      isAuthenticated,
      session,
      user,
    };
  });
