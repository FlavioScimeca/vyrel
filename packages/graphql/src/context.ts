import { auth } from "@vyrel/auth";
import type { AuthClaims } from "@vyrel/auth/lib/verify-bearer";
import { verifyBearer } from "@vyrel/auth/lib/verify-bearer";
import { type AuditableLogger, createLogger } from "@vyrel/logging";
import { useLogger } from "@vyrel/logging/elysia";
import type { Session, User } from "better-auth";

export type GraphQLSession = { user: User; session: Session } | null;

/** Request → logger for Yoga plugins that do not receive GraphQL context. */
export const graphqlRequestLoggers = new WeakMap<Request, AuditableLogger>();

/** Yoga / Pothos request context. */
export interface GraphQLContext {
  headers: Headers;
  isAuthenticated: boolean;
  /** Request-scoped wide-event logger (Elysia ALS when available). */
  log: AuditableLogger;
  session: GraphQLSession;
  user?: AuthClaims;
}

/** Authenticated user id from session cookie or Bearer JWT. */
export function resolveActorUserId(
  context: GraphQLContext
): string | undefined {
  return context.session?.user.id ?? context.user?.id;
}

function resolveRequestLogger(): AuditableLogger {
  try {
    // biome-ignore lint/correctness/useHookAtTopLevel: evlog request ALS accessor, not a React hook
    return useLogger();
  } catch {
    return createLogger({ module: "graphql" });
  }
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
    const requestLog = resolveRequestLogger();
    graphqlRequestLoggers.set(request, requestLog);

    if (user !== undefined) {
      requestLog.set({ user: { id: user.id } });
    } else if (session?.user.id !== undefined) {
      requestLog.set({ user: { id: session.user.id } });
    }

    return {
      headers: request.headers,
      isAuthenticated,
      log: requestLog,
      session,
      user,
    };
  });
