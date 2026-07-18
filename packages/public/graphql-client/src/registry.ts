import type { ApolloCache, OperationVariables } from "@apollo/client";
import type { DocumentNode } from "graphql";

export interface CanonicalCollectionDefinition {
  readonly query: DocumentNode;
  /** Response key used by cache.updateQuery, including aliases. */
  readonly responseKey: string;
  /** GraphQL schema field stored by Apollo on ROOT_QUERY. */
  readonly storeFieldName: string;
}

export interface CrudMutationDefinition {
  readonly collectionVariablePaths?: Readonly<
    Record<string, readonly [string, ...string[]]>
  >;
  readonly entityType: string;
  readonly keyField: string;
  readonly kind: "create" | "delete" | "update";
}

export interface GraphqlClientRegistry {
  readonly collections: Readonly<Record<string, CanonicalCollectionDefinition>>;
  readonly mutations: Readonly<
    Record<string, Readonly<Record<string, CrudMutationDefinition>>>
  >;
}

const registries = new WeakMap<object, GraphqlClientRegistry>();

export const defineGraphqlClientRegistry = <
  const TRegistry extends GraphqlClientRegistry,
>(
  registry: TRegistry
): TRegistry => registry;

export const configureGraphqlClientCache = <TCache extends ApolloCache>(
  cache: TCache,
  registry: GraphqlClientRegistry
): TCache => {
  registries.set(cache, registry);
  return cache;
};

export const getGraphqlClientRegistry = (
  cache: ApolloCache
): GraphqlClientRegistry => {
  const registry = registries.get(cache);
  if (registry === undefined) {
    throw new Error(
      "The Apollo cache is not configured with the generated @vyrel/graphql-client registry."
    );
  }

  return registry;
};

const readPath = (
  source: OperationVariables,
  path: readonly string[]
): unknown => {
  let value: unknown = source;

  for (const segment of path) {
    if (typeof value !== "object" || value === null) {
      return;
    }
    value = (value as Record<string, unknown>)[segment];
  }

  return value;
};

export const resolveCollectionVariables = (
  variablePaths: Readonly<Record<string, readonly [string, ...string[]]>>,
  mutationVariables: OperationVariables
): OperationVariables => {
  const variables: OperationVariables = {};

  for (const [name, path] of Object.entries(variablePaths)) {
    const value = readPath(mutationVariables, path);
    if (value === undefined) {
      throw new Error(
        `Could not resolve collection variable "${name}" from mutation path "${path.join(".")}".`
      );
    }
    variables[name] = value;
  }

  return variables;
};
