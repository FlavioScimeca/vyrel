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
