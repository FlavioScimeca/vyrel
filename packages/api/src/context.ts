import type { Session, User } from "better-auth";

import type { PothosContext } from "./graphql/builder";

export function createContext(
  session: { user: User; session: Session } | null
): PothosContext {
  return { session };
}
