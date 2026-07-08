import type { PothosContext } from "@vyrel/graphql";
import type { Session, User } from "better-auth";

export function createContext(
  session: { user: User; session: Session } | null
): PothosContext {
  return { session };
}
