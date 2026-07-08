import SchemaBuilder from "@pothos/core";
import type { Session, User } from "better-auth";

export interface PothosContext {
  session: { user: User; session: Session } | null;
}

const builder = new SchemaBuilder<{
  Context: PothosContext;
}>({});

export { builder };
