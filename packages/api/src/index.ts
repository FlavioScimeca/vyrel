import { createYoga } from "graphql-yoga";

import type { PothosContext } from "./graphql/builder";

import { schema } from "./graphql/schema";

export type { PothosContext } from "./graphql/builder";
// biome-ignore lint/performance/noBarrelFile: public package entry point re-exports the schema
export { schema } from "./graphql/schema";

export function createGraphQLHandler(
  contextFactory: (request: Request) => PothosContext | Promise<PothosContext>
) {
  return createYoga<Record<string, unknown>, PothosContext>({
    context: ({ request }) => contextFactory(request),
    schema,
  });
}
