import type { FieldMap, SchemaTypes } from "@pothos/core";

import type { PothosSchemaBuilder } from "./zod-pothos-inputs";

export type ConnectionPageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};

export type ConnectionPayload<TNode> = {
  nodes: TNode[];
  pageInfo: ConnectionPageInfo;
};

export type MorphConnectionOptions<TNodeType> = {
  readonly fields?: (t: unknown) => FieldMap | undefined;
  readonly name?: string;
  readonly pageInfoName?: string;
  readonly type: TNodeType;
};

/**
 * Forward-cursor Connection + PageInfo objects for a model.
 * Shape: `{ nodes, pageInfo: { endCursor, hasNextPage } }` (not full Relay).
 */
export const createMorphConnection = <Types extends SchemaTypes, TNodeType>(
  graphqlBuilder: PothosSchemaBuilder<Types>,
  objectName: string,
  options: MorphConnectionOptions<TNodeType>
) => {
  const connectionName = options.name ?? `${objectName}Connection`;
  const pageInfoName = options.pageInfoName ?? `${objectName}PageInfo`;

  // Field builders are cast loosely: morph is generic over consumer SchemaTypes,
  // so expose*/field inference against ConnectionPageInfo is not available here.
  const pageInfoRef = graphqlBuilder
    .objectRef<ConnectionPageInfo>(pageInfoName)
    .implement({
      fields: ((t: {
        exposeBoolean: (
          name: string,
          options: { nullable: boolean }
        ) => unknown;
        exposeString: (name: string, options: { nullable: boolean }) => unknown;
      }) => ({
        endCursor: t.exposeString("endCursor", { nullable: true }),
        hasNextPage: t.exposeBoolean("hasNextPage", { nullable: false }),
      })) as never,
    });

  return graphqlBuilder
    .objectRef<ConnectionPayload<unknown>>(connectionName)
    .implement({
      fields: ((t: {
        field: (config: {
          nullable: boolean;
          resolve: (parent: ConnectionPayload<unknown>) => unknown;
          type: unknown;
        }) => unknown;
      }) => ({
        nodes: t.field({
          nullable: false,
          resolve: (connection) => connection.nodes,
          type: [options.type],
        }),
        pageInfo: t.field({
          nullable: false,
          resolve: (connection) => connection.pageInfo,
          type: pageInfoRef,
        }),
        ...(options.fields?.(t) ?? {}),
      })) as never,
    });
};
