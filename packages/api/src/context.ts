import type { GraphQLContext } from "@vyrel/graphql/context";

export function createContext(
  session: GraphQLContext["session"]
): Pick<GraphQLContext, "session"> {
  return { session };
}
