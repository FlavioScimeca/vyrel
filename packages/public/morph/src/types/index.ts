import "@pothos/plugin-validation";
import "@pothos/plugin-with-input";
import type { builder } from "./pothos";

export type AppSchemaTypes = typeof builder.$inferSchemaTypes;

export type TypeMutationFieldBuilder = Parameters<
  Parameters<typeof builder.mutationFields>[0]
>[0];

export type TypeQueryFieldBuilder = Parameters<
  Parameters<typeof builder.queryFields>[0]
>[0];
