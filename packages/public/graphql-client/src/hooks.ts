"use client";

import type {
  ApolloCache,
  OperationVariables,
  TypedDocumentNode,
} from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import {
  type CollectionOverride,
  prependToCollectionVariant,
  prependToList,
  removeFromAllListVariants,
} from "./collection";
import {
  getMutationEntitySelection,
  getOperationName,
  getRootResponseKey,
} from "./document";
import type { OptimisticListIdentity } from "./optimistic-list-identity";
import {
  type CanonicalCollectionDefinition,
  type CrudMutationDefinition,
  getGraphqlClientRegistry,
  resolveCollectionVariables,
} from "./registry";
import type { DataOf, MutationFragmentData, VariablesOf } from "./types";

type MutationDocument<
  TData,
  TVariables extends OperationVariables,
> = TypedDocumentNode<TData, TVariables>;

type NoConfiguredVariables = Record<never, never>;

type MutationOptions<TData, TVariables extends OperationVariables> = Omit<
  useMutation.Options<TData, TVariables, ApolloCache, NoConfiguredVariables>,
  "optimisticResponse" | "update"
>;

type MutationUpdate<TData, TVariables extends OperationVariables> = NonNullable<
  useMutation.Options<
    TData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  >["update"]
>;

interface SharedOptions {
  /** Top-level mutation field. Only needed for multi-field mutations. */
  readonly field?: string;
}

/** Additional list variant to prepend into after the canonical collection write. */
export type OptimisticCreateCollectionOverride<
  TData = unknown,
  TVariables extends OperationVariables = OperationVariables,
> = CollectionOverride<TData, TVariables>;

export type OptimisticCreateCollectionOption<
  TMutationVariables extends OperationVariables,
  TCollectionData = unknown,
  TCollectionVariables extends OperationVariables = OperationVariables,
> =
  | OptimisticCreateCollectionOverride<TCollectionData, TCollectionVariables>
  | ((
      variables: TMutationVariables
    ) =>
      | OptimisticCreateCollectionOverride<
          TCollectionData,
          TCollectionVariables
        >
      | undefined);

export type OptimisticCreateOptions<
  TMutationData,
  TVariables extends OperationVariables,
  TCollectionData = unknown,
  TCollectionVariables extends OperationVariables = OperationVariables,
> = MutationOptions<TMutationData, TVariables> &
  SharedOptions & {
    /**
     * Optional extra list variant to update in addition to the canonical
     * collection resolved from the mutation registry. Never replaces the base
     * write. Pass only when the visible query uses variables the mutation
     * cannot supply (e.g. search filters). May be a function of mutation
     * variables so the app can gate on domain membership.
     */
    readonly collection?: OptimisticCreateCollectionOption<
      TVariables,
      TCollectionData,
      TCollectionVariables
    >;
    /** Apollo cache key field. Defaults to `id`. */
    readonly keyField?: string;
    /**
     * Optional stable list-key tracker. Each mutation invocation owns its
     * optimistic id, including when concurrent responses finish out of order.
     */
    readonly identity?: OptimisticListIdentity;
    readonly optimistic: (
      variables: TVariables
    ) => Partial<MutationFragmentData<TMutationData>>;
    readonly optimisticId?: (variables: TVariables) => string;
    /** Additional Apollo update callback, invoked after the built-in behavior. */
    readonly update?: MutationUpdate<TMutationData, TVariables>;
  };

export type OptimisticUpdateOptions<
  TMutationData,
  TVariables extends OperationVariables,
> = MutationOptions<TMutationData, TVariables> &
  SharedOptions & {
    /** Complete current data for every field selected by the mutation fragment. */
    readonly current: MutationFragmentData<TMutationData>;
    readonly optimistic: (
      variables: TVariables,
      current: Readonly<MutationFragmentData<TMutationData>>
    ) => Partial<MutationFragmentData<TMutationData>>;
    /** Additional Apollo update callback. */
    readonly update?: MutationUpdate<TMutationData, TVariables>;
  };

export type OptimisticDeleteOptions<
  TMutationData,
  TVariables extends OperationVariables,
> = MutationOptions<TMutationData, TVariables> &
  SharedOptions & {
    readonly id: (variables: TVariables) => string;
    /** Apollo cache key field. Defaults to `id`. */
    readonly keyField?: string;
    /** Additional Apollo update callback, invoked after the built-in behavior. */
    readonly update?: MutationUpdate<TMutationData, TVariables>;
  };

const createOptimisticId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `optimistic-${randomId ?? Math.random().toString(36).slice(2)}`;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const readRootValue = (data: unknown, field: string): unknown =>
  asRecord(data)?.[field];

const addConventionalFields = (
  entity: Record<string, unknown>,
  fields: ReadonlySet<string>
): Record<string, unknown> => {
  // @effect-diagnostics globalDate:off
  const now = new Date().toISOString();
  const conventionalFields: Record<string, unknown> = {};

  if (fields.has("createdAt") && entity.createdAt === undefined) {
    conventionalFields.createdAt = now;
  }
  if (fields.has("updatedAt") && entity.updatedAt === undefined) {
    conventionalFields.updatedAt = now;
  }

  return { ...conventionalFields, ...entity };
};

const getCanonicalCollection = (
  cache: ApolloCache,
  operationName: string,
  responseKey: string,
  expectedKind: "create" | "delete",
  expectedEntityType?: string
): {
  readonly collection: CanonicalCollectionDefinition;
  readonly entityType: string;
  readonly mutation: CrudMutationDefinition;
} => {
  const registry = getGraphqlClientRegistry(cache);
  const operation = registry.mutations[operationName];
  const mutation = operation?.[responseKey];
  if (mutation === undefined || mutation.kind !== expectedKind) {
    throw new Error(
      `Mutation field "${operationName}.${responseKey}" is not registered as a canonical ${expectedKind} operation.`
    );
  }

  if (
    expectedEntityType !== undefined &&
    mutation.entityType !== expectedEntityType
  ) {
    throw new Error(
      `Mutation "${operationName}" returns "${expectedEntityType}" but its generated registry entry targets "${mutation.entityType}".`
    );
  }

  const collection = registry.collections[mutation.entityType];
  if (collection === undefined) {
    throw new Error(
      `No canonical collection is registered for GraphQL type "${mutation.entityType}".`
    );
  }

  return {
    collection,
    entityType: mutation.entityType,
    mutation,
  };
};

export const useOptimisticCreate = <
  TMutationData,
  TVariables extends OperationVariables,
  TCollectionData = unknown,
  TCollectionVariables extends OperationVariables = OperationVariables,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticCreateOptions<
    TMutationData,
    TVariables,
    TCollectionData,
    TCollectionVariables
  >
) => {
  const apolloClient = useApolloClient(options.client);
  const {
    collection: collectionOverride,
    field,
    identity,
    keyField,
    optimistic,
    optimisticId,
    update,
    ...apolloOptions
  } = options;
  const operationName = getOperationName(mutation, "mutation");
  const responseKey = getRootResponseKey(mutation, "mutation", field);
  const entitySelection = getMutationEntitySelection(mutation, field);
  const canonical = getCanonicalCollection(
    apolloClient.cache,
    operationName,
    responseKey,
    "create",
    entitySelection.typename
  );
  const resolvedKeyField = keyField ?? canonical.mutation.keyField;

  const {
    onCompleted: configuredOnCompleted,
    onError: configuredOnError,
    ...baseApolloOptions
  } = apolloOptions;
  const mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  > = {
    ...baseApolloOptions,
  };
  const [mutate, mutationResult] = useMutation(mutation, mutationOptions);

  const writeCreatedEntityToCollections = (
    cache: ApolloCache,
    createdEntity: unknown,
    mutationVariables: TVariables | undefined
  ): void => {
    const collectionVariables = resolveCollectionVariables(
      canonical.mutation.collectionVariablePaths ?? {},
      mutationVariables ?? {}
    );
    prependToList(
      cache,
      {
        query: canonical.collection.query,
        responseKey: canonical.collection.responseKey,
        variables: collectionVariables,
      },
      createdEntity
    );

    if (collectionOverride === undefined) {
      return;
    }

    const resolvedOverride =
      typeof collectionOverride === "function"
        ? collectionOverride(mutationVariables ?? ({} as TVariables))
        : collectionOverride;

    if (resolvedOverride !== undefined) {
      prependToCollectionVariant(cache, {
        entity: createdEntity,
        query: resolvedOverride.query,
        variables: resolvedOverride.variables,
      });
    }
  };

  const execute = ((...args: Parameters<typeof mutate>) => {
    const [executeOptions] = args;
    const mutationVariables = {
      ...apolloOptions.variables,
      ...executeOptions?.variables,
    } as unknown as TVariables;
    const optimisticEntity = optimistic(mutationVariables);
    const optimisticRecord = asRecord(optimisticEntity) ?? {};
    const optimisticRecordId = optimisticRecord[resolvedKeyField];
    const explicitOptimisticId =
      typeof optimisticRecordId === "string"
        ? optimisticRecordId
        : optimisticId?.(mutationVariables);
    const temporaryId =
      identity?.begin(explicitOptimisticId) ??
      explicitOptimisticId ??
      createOptimisticId();
    let identitySettled = false;
    const applicationUpdate = executeOptions?.update ?? update;
    const applicationOnError = executeOptions?.onError ?? configuredOnError;
    const applicationOnCompleted =
      executeOptions?.onCompleted ?? configuredOnCompleted;
    const optimisticResponseEntity = addConventionalFields(
      {
        __typename: entitySelection.typename,
        [resolvedKeyField]: optimisticRecord[resolvedKeyField] ?? temporaryId,
        ...optimisticRecord,
      },
      entitySelection.fields
    );

    return mutate({
      ...executeOptions,
      onCompleted: (data, clientOptions) => {
        if (!identitySettled) {
          identity?.abandon(temporaryId);
          identitySettled = true;
        }
        applicationOnCompleted?.(data, clientOptions);
      },
      onError: (error, clientOptions) => {
        if (!identitySettled) {
          identity?.abandon(temporaryId);
          identitySettled = true;
        }
        applicationOnError?.(error, clientOptions);
      },
      optimisticResponse: {
        [responseKey]: optimisticResponseEntity,
      } as never,
      update: (cache, result, context) => {
        const createdEntity = readRootValue(result.data, responseKey);
        if (createdEntity !== null && createdEntity !== undefined) {
          writeCreatedEntityToCollections(
            cache,
            createdEntity,
            context.variables
          );

          const entityKey = asRecord(createdEntity)?.[resolvedKeyField];
          if (
            identity !== undefined &&
            !identitySettled &&
            typeof entityKey === "string" &&
            entityKey !== temporaryId
          ) {
            identity.commit(temporaryId, entityKey);
            identitySettled = true;
          }
        }

        applicationUpdate?.(cache, result, context);
      },
      variables: mutationVariables,
    });
  }) as typeof mutate;

  return [execute, mutationResult] as const;
};

export const useOptimisticUpdate = <
  TMutationData,
  TVariables extends OperationVariables,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticUpdateOptions<TMutationData, TVariables>
) => {
  const { current, field, optimistic, update, ...apolloOptions } = options;
  const responseKey = getRootResponseKey(mutation, "mutation", field);
  const entitySelection = getMutationEntitySelection(mutation, field);
  const currentRecord = asRecord(current) ?? {};
  const mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  > = {
    ...apolloOptions,
    optimisticResponse: (variables) =>
      ({
        [responseKey]: {
          __typename: entitySelection.typename,
          ...currentRecord,
          ...optimistic(variables, current),
        },
      }) as never,
    update,
  };

  return useMutation(mutation, mutationOptions);
};

const identifyEntity = (
  cache: ApolloCache,
  typename: string | undefined,
  keyField: string,
  keyValue: string
): string | undefined => {
  if (typename === undefined) {
    return;
  }

  return cache.identify({
    __typename: typename,
    [keyField]: keyValue,
  });
};

const evictEntity = (cache: ApolloCache, normalizedId?: string): void => {
  if (normalizedId !== undefined) {
    cache.evict({ id: normalizedId });
    cache.gc();
  }
};

export const useOptimisticDelete = <
  TMutationData,
  TVariables extends OperationVariables,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticDeleteOptions<TMutationData, TVariables>
) => {
  const apolloClient = useApolloClient(options.client);
  const { field, id, keyField, update, ...apolloOptions } = options;
  const responseKey = getRootResponseKey(mutation, "mutation", field);
  const operationName = getOperationName(mutation, "mutation");
  const canonical = getCanonicalCollection(
    apolloClient.cache,
    operationName,
    responseKey,
    "delete"
  );
  const resolvedKeyField = keyField ?? canonical.mutation.keyField;

  const mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  > = {
    ...apolloOptions,
    optimisticResponse: (variables) =>
      ({
        [responseKey]: id(variables),
      }) as never,
    update: (cache, result, context) => {
      const { variables } = context;
      if (variables === undefined) {
        update?.(cache, result, context);
        return;
      }

      const deletedId = id(variables);
      const normalizedId = identifyEntity(
        cache,
        canonical.entityType,
        resolvedKeyField,
        deletedId
      );

      removeFromAllListVariants(
        cache,
        canonical.collection.storeFieldName,
        resolvedKeyField,
        deletedId
      );
      evictEntity(cache, normalizedId);

      update?.(cache, result, context);
    },
  };

  return useMutation(mutation, mutationOptions);
};

export type MutationDataOf<TDocument> = DataOf<TDocument>;
export type MutationVariablesOf<TDocument> = VariablesOf<TDocument>;
