import { auth } from "@vyrel/auth";
import { onlyVerifiedSession } from "@vyrel/auth/lib/verified-session";
import type { AuthClaims } from "@vyrel/auth/lib/verify-bearer";
import { verifyBearer } from "@vyrel/auth/lib/verify-bearer";
import { type AuditableLogger, createLogger } from "@vyrel/logging";
import { useLogger } from "@vyrel/logging/elysia";
import type { Session, User } from "better-auth";
import { GraphQLError } from "graphql";

export type GraphQLSession = { user: User; session: Session } | null;

/** Request → logger for Yoga plugins that do not receive GraphQL context. */
export const graphqlRequestLoggers = new WeakMap<Request, AuditableLogger>();

/** Yoga / Pothos request context. */
export interface GraphQLContext {
  actorUserId: string | null;
  headers: Headers;
  isAuthenticated: boolean;
  /** Request-scoped wide-event logger (Elysia ALS when available). */
  log: AuditableLogger;
  session: GraphQLSession;
  user?: AuthClaims;
}

/** Defense-in-depth guard for resolvers executed outside the Yoga auth plugin. */
export function requireActorUserId(context: GraphQLContext): string {
  if (context.actorUserId !== null) {
    return context.actorUserId;
  }

  throw new GraphQLError("UNAUTHENTICATED", {
    extensions: {
      code: "UNAUTHENTICATED",
      http: { status: 401 },
    },
  });
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
  ]).then(([rawSession, user]) => {
    const session = onlyVerifiedSession(rawSession);
    const actorUserId = session?.user.id ?? user?.id ?? null;
    const isAuthenticated = actorUserId !== null;
    const requestLog = resolveRequestLogger();
    graphqlRequestLoggers.set(request, requestLog);

    if (actorUserId !== null) {
      requestLog.set({ user: { id: actorUserId } });
    }

    return {
      actorUserId,
      headers: request.headers,
      isAuthenticated,
      log: requestLog,
      session,
      user,
    };
  });
