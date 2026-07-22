"use client";

import type {
  OperationVariables,
  TypedDocumentNode,
  Unmasked,
} from "@apollo/client";
import { useSuspenseQuery } from "@apollo/client/react";

import { type CollectionMatch, createCollectionHandle } from "./collection";
import { getRootResponseKey } from "./document";
import type { ArrayFieldKey, ArrayItemAt, ResolvedFragmentData } from "./types";

type CollectionData<TData> = Unmasked<TData>;

type CollectionItem<TData> = ResolvedFragmentData<
  ArrayItemAt<CollectionData<TData>, ArrayFieldKey<CollectionData<TData>>>
>;

export type CollectionQueryOptions<
  TData,
  TVariables extends OperationVariables,
> = Omit<useSuspenseQuery.Options<TVariables>, "variables"> & {
  /** Top-level list field. Only needed for multi-field queries. */
  readonly field?: ArrayFieldKey<CollectionData<TData>>;
  readonly matches?: (
    item: CollectionItem<TData>,
    variables: Readonly<TVariables>
  ) => CollectionMatch;
  readonly variables: TVariables;
};

export const useCollectionQuery = <
  TData,
  TVariables extends OperationVariables,
>(
  query: TypedDocumentNode<TData, TVariables>,
  options: CollectionQueryOptions<TData, TVariables>
) => {
  const { field, matches, variables, ...apolloOptions } = options;
  const result = useSuspenseQuery(query, {
    ...apolloOptions,
    variables,
  });
  const responseKey = getRootResponseKey(query, "query", field);
  const collection = createCollectionHandle<CollectionItem<TData>>(
    {
      query,
      responseKey,
      variables,
    },
    matches === undefined ? undefined : (item) => matches(item, variables)
  );

  return { ...result, collection };
};

export type CollectionItemOf<TDocument> =
  TDocument extends TypedDocumentNode<infer TData, infer _TVariables>
    ? CollectionItem<TData>
    : never;
