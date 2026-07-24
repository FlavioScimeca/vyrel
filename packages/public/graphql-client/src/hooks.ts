"use client";

import type {
  ApolloCache,
  OperationVariables,
  TypedDocumentNode,
} from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import {
  type CollectionOverride,
  type CollectionPlacement,
  insertIntoCollectionVariant,
  insertIntoList,
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
import type {
  DataOf,
  MutationFieldOption,
  MutationFragmentDataAt,
  MutationResponseKey,
  VariablesOf,
} from "./types";

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

type ControlledMutationFunctionOptions<
  TData,
  TVariables extends OperationVariables,
> = Omit<
  useMutation.MutationFunctionOptions<TData, TVariables, ApolloCache>,
  "optimisticResponse"
>;

export type ControlledMutationFunction<
  TData,
  TVariables extends OperationVariables,
> = (
  ...[options]: NoConfiguredVariables extends TVariables
    ? [
        options?: ControlledMutationFunctionOptions<TData, TVariables> & {
          readonly variables?: TVariables;
        },
      ]
    : [
        options: ControlledMutationFunctionOptions<TData, TVariables> & {
          readonly variables: TVariables;
        },
      ]
) => ReturnType<useMutation.MutationFunction<TData, TVariables, ApolloCache>>;

/** Additional list variant to update after the canonical collection write. */
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
  TField extends
    MutationResponseKey<TMutationData> = MutationResponseKey<TMutationData>,
> = MutationOptions<TMutationData, TVariables> &
  MutationFieldOption<TMutationData, TField> & {
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
    /** Insert at the start (default) or end of canonical and override lists. */
    readonly placement?: CollectionPlacement;
    /**
     * Optional stable list-key tracker. Each mutation invocation owns its
     * optimistic id, including when concurrent responses finish out of order.
     */
    readonly identity?: OptimisticListIdentity;
    readonly optimistic: (
      variables: TVariables
    ) => Partial<MutationFragmentDataAt<TMutationData, TField>>;
    readonly optimisticId?: (variables: TVariables) => string;
    /** Additional Apollo update callback, invoked after the built-in behavior. */
    readonly update?: MutationUpdate<TMutationData, TVariables>;
  };

export type OptimisticUpdateOptions<
  TMutationData,
  TVariables extends OperationVariables,
  TField extends
    MutationResponseKey<TMutationData> = MutationResponseKey<TMutationData>,
> = MutationOptions<TMutationData, TVariables> &
  MutationFieldOption<TMutationData, TField> & {
    /** Complete current data for every field selected by the mutation fragment. */
    readonly current: MutationFragmentDataAt<TMutationData, TField>;
    readonly optimistic: (
      variables: TVariables,
      current: Readonly<MutationFragmentDataAt<TMutationData, TField>>
    ) => Partial<MutationFragmentDataAt<TMutationData, TField>>;
    /** Additional Apollo update callback. */
    readonly update?: MutationUpdate<TMutationData, TVariables>;
  };

export type OptimisticDeleteOptions<
  TMutationData,
  TVariables extends OperationVariables,
  TField extends
    MutationResponseKey<TMutationData> = MutationResponseKey<TMutationData>,
> = MutationOptions<TMutationData, TVariables> &
  MutationFieldOption<TMutationData, TField> & {
    readonly id: (variables: TVariables) => string;
    /** Stable list-key tracker shared with the matching optimistic create. */
    readonly identity?: OptimisticListIdentity;
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

const getCrudMutation = (
  cache: ApolloCache,
  operationName: string,
  responseKey: string,
  expectedKind: "create" | "delete",
  expectedEntityType?: string
): {
  readonly collection?: CanonicalCollectionDefinition;
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

  return {
    collection: registry.collections[mutation.entityType],
    entityType: mutation.entityType,
    mutation,
  };
};

const requireCanonicalCollection = (
  definition: ReturnType<typeof getCrudMutation>,
  operationName: string
): ReturnType<typeof getCrudMutation> & {
  readonly collection: CanonicalCollectionDefinition;
} => {
  if (definition.collection === undefined) {
    throw new Error(
      `Create mutation "${operationName}" has no canonical collection for GraphQL type "${definition.entityType}".`
    );
  }
  return {
    ...definition,
    collection: definition.collection,
  };
};

export const useOptimisticCreate = <
  TMutationData,
  TVariables extends OperationVariables,
  TCollectionData = unknown,
  TCollectionVariables extends OperationVariables = OperationVariables,
  TField extends
    MutationResponseKey<TMutationData> = MutationResponseKey<TMutationData>,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticCreateOptions<
    TMutationData,
    TVariables,
    TCollectionData,
    TCollectionVariables,
    TField
  >
) => {
  const apolloClient = useApolloClient(options.client);
  const {
    collection: collectionOverride,
    field,
    identity,
    optimistic,
    optimisticId,
    placement = "prepend",
    update,
    ...apolloOptions
  } = options;
  const operationName = getOperationName(mutation, "mutation");
  const selectedField = field as string | undefined;
  const responseKey = getRootResponseKey(mutation, "mutation", selectedField);
  const entitySelection = getMutationEntitySelection(mutation, selectedField);
  const canonical = requireCanonicalCollection(
    getCrudMutation(
      apolloClient.cache,
      operationName,
      responseKey,
      "create",
      entitySelection.typename
    ),
    operationName
  );
  const resolvedKeyField = canonical.mutation.keyField;

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
    insertIntoList(
      cache,
      {
        query: canonical.collection.query,
        responseKey: canonical.collection.responseKey,
        variables: collectionVariables,
      },
      createdEntity,
      placement
    );

    if (collectionOverride === undefined) {
      return;
    }

    const resolvedOverride =
      typeof collectionOverride === "function"
        ? collectionOverride(mutationVariables ?? ({} as TVariables))
        : collectionOverride;

    if (resolvedOverride !== undefined) {
      insertIntoCollectionVariant(cache, {
        entity: createdEntity,
        placement,
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
  }) as ControlledMutationFunction<TMutationData, TVariables>;

  return [execute, mutationResult] as const;
};

export const useOptimisticUpdate = <
  TMutationData,
  TVariables extends OperationVariables,
  TField extends MutationResponseKey<TMutationData>,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticUpdateOptions<TMutationData, TVariables, TField>
) => {
  const { current, field, optimistic, update, ...apolloOptions } = options;
  const selectedField = field as string | undefined;
  const responseKey = getRootResponseKey(mutation, "mutation", selectedField);
  const entitySelection = getMutationEntitySelection(mutation, selectedField);
  const currentRecord = asRecord(current) ?? {};
  const mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  > = {
    ...apolloOptions,
  };

  const [mutate, mutationResult] = useMutation(mutation, mutationOptions);
  const execute = ((...args: Parameters<typeof mutate>) => {
    const [executeOptions] = args;
    const mutationVariables = {
      ...apolloOptions.variables,
      ...executeOptions?.variables,
    } as unknown as TVariables;
    const applicationUpdate = executeOptions?.update ?? update;

    return mutate({
      ...executeOptions,
      optimisticResponse: {
        [responseKey]: {
          __typename: entitySelection.typename,
          ...currentRecord,
          ...optimistic(mutationVariables, current),
        },
      } as never,
      update: applicationUpdate,
      variables: mutationVariables,
    });
  }) as ControlledMutationFunction<TMutationData, TVariables>;

  return [execute, mutationResult] as const;
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
    cache.modify({
      fields: (_value, { DELETE }) => DELETE,
      id: normalizedId,
    });
    cache.gc();
  }
};

export const useOptimisticDelete = <
  TMutationData,
  TVariables extends OperationVariables,
  TField extends MutationResponseKey<TMutationData>,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticDeleteOptions<TMutationData, TVariables, TField>
) => {
  const apolloClient = useApolloClient(options.client);
  const { field, id, identity, update, ...apolloOptions } = options;
  const responseKey = getRootResponseKey(
    mutation,
    "mutation",
    field as string | undefined
  );
  const operationName = getOperationName(mutation, "mutation");
  const canonical = getCrudMutation(
    apolloClient.cache,
    operationName,
    responseKey,
    "delete"
  );
  const resolvedKeyField = canonical.mutation.keyField;

  const mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  > = {
    ...apolloOptions,
  };

  const [mutate, mutationResult] = useMutation(mutation, mutationOptions);
  const execute = ((...args: Parameters<typeof mutate>) => {
    const [executeOptions] = args;
    const mutationVariables = {
      ...apolloOptions.variables,
      ...executeOptions?.variables,
    } as unknown as TVariables;
    const deletedId = id(mutationVariables);
    const applicationUpdate = executeOptions?.update ?? update;
    const applicationOnCompleted =
      executeOptions?.onCompleted ?? apolloOptions.onCompleted;

    return mutate({
      ...executeOptions,
      onCompleted: (data, clientOptions) => {
        identity?.release(deletedId);
        applicationOnCompleted?.(data, clientOptions);
      },
      optimisticResponse: {
        [responseKey]: deletedId,
      } as never,
      update: (cache, result, context) => {
        const normalizedId = identifyEntity(
          cache,
          canonical.entityType,
          resolvedKeyField,
          deletedId
        );

        if (canonical.collection !== undefined) {
          removeFromAllListVariants(
            cache,
            canonical.collection.storeFieldName,
            resolvedKeyField,
            deletedId
          );
        }
        evictEntity(cache, normalizedId);
        applicationUpdate?.(cache, result, context);
      },
      variables: mutationVariables,
    });
  }) as ControlledMutationFunction<TMutationData, TVariables>;

  return [execute, mutationResult] as const;
};

export type MutationDataOf<TDocument> = DataOf<TDocument>;
export type MutationVariablesOf<TDocument> = VariablesOf<TDocument>;
