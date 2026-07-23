import type {
  ApolloCache,
  OperationVariables,
  StoreObject,
  TypedDocumentNode,
} from "@apollo/client";
import type { DocumentNode } from "graphql";

import { getRootResponseKey } from "./document";
import type { DataOf } from "./types";

export interface CollectionDescriptor {
  readonly query: DocumentNode;
  readonly responseKey: string;
  readonly variables: OperationVariables;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const identify = (cache: ApolloCache, value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return;
  }

  return cache.identify(value as StoreObject);
};

const updateList = (
  cache: ApolloCache,
  collection: CollectionDescriptor,
  update: (items: readonly unknown[]) => readonly unknown[]
): void => {
  const field = getRootResponseKey(
    collection.query,
    "query",
    collection.responseKey
  );

  cache.updateQuery(
    {
      overwrite: true,
      query: collection.query,
      variables: collection.variables,
    },
    (data) => {
      if (!isRecord(data)) {
        return data;
      }

      const items = data[field];
      if (!Array.isArray(items)) {
        throw new Error(
          `The collection field "${field}" must be a top-level array in V1.`
        );
      }

      return { ...data, [field]: update(items) } as DataOf<
        TypedDocumentNode<unknown, OperationVariables>
      >;
    }
  );
};

export const prependToList = (
  cache: ApolloCache,
  collection: CollectionDescriptor,
  entity: unknown
): void => {
  const entityCacheId = identify(cache, entity);

  updateList(cache, collection, (items) => {
    if (entityCacheId === undefined) {
      return [entity, ...items];
    }

    return [
      entity,
      ...items.filter((item) => identify(cache, item) !== entityCacheId),
    ];
  });
};

/** Exact list query + variables used for a dual-write / escape-hatch update. */
export type CollectionOverride<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
> = {
  readonly query: TypedDocumentNode<TData, TVariables>;
  readonly variables: TVariables;
};

/**
 * Mechanical helper: return a typed collection override when `when` is true.
 * Domain membership stays in the application (`when` is already decided).
 */
export const collectionOverrideWhen = <
  TData,
  TVariables extends OperationVariables,
>({
  query,
  variables,
  when,
}: {
  readonly query: TypedDocumentNode<TData, TVariables>;
  readonly variables: TVariables;
  readonly when: boolean;
}): CollectionOverride<TData, TVariables> | undefined => {
  if (!when) {
    return;
  }

  return { query, variables };
};

/** Public escape hatch: prepend an entity to an exact list query variant. */
export const prependToCollectionVariant = <
  TData,
  TVariables extends OperationVariables,
>(
  cache: ApolloCache,
  options: {
    readonly entity: unknown;
    readonly query: TypedDocumentNode<TData, TVariables>;
    readonly responseKey?: string;
    readonly variables: TVariables;
  }
): void => {
  const responseKey =
    options.responseKey ?? getRootResponseKey(options.query, "query");

  prependToList(
    cache,
    {
      query: options.query,
      responseKey,
      variables: options.variables,
    },
    options.entity
  );
};

/** Public escape hatch: remove an entity from an exact list query variant. */
export const removeFromCollectionVariant = <
  TData,
  TVariables extends OperationVariables,
>(
  cache: ApolloCache,
  options: {
    readonly keyField?: string;
    readonly keyValue: string;
    readonly query: TypedDocumentNode<TData, TVariables>;
    readonly responseKey?: string;
    readonly variables: TVariables;
  }
): void => {
  const keyField = options.keyField ?? "id";
  const responseKey =
    options.responseKey ?? getRootResponseKey(options.query, "query");

  updateList(
    cache,
    {
      query: options.query,
      responseKey,
      variables: options.variables,
    },
    (items) =>
      items.filter((item) => {
        if (!isRecord(item)) {
          return true;
        }
        return item[keyField] !== options.keyValue;
      })
  );
};

export const removeFromAllListVariants = (
  cache: ApolloCache,
  field: string,
  keyField: string,
  keyValue: unknown
): void => {
  cache.modify({
    fields: {
      [field]: (items: unknown, { readField }) => {
        if (!Array.isArray(items)) {
          return items;
        }

        return items.filter(
          (item) => readField(keyField, item as StoreObject) !== keyValue
        );
      },
    },
    id: "ROOT_QUERY",
  });
};
