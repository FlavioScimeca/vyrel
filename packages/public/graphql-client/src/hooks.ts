"use client";

import type {
  ApolloCache,
  ApolloClient,
  OperationVariables,
  TypedDocumentNode,
} from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useCallback } from "react";

import { prependToList, removeFromAllListVariants } from "./collection";
import {
  getMutationEntitySelection,
  getOperationName,
  getRootResponseKey,
} from "./document";
import {
  type CanonicalCollectionDefinition,
  type CrudMutationDefinition,
  getGraphqlClientRegistry,
  resolveCollectionVariables,
} from "./registry";
import type {
  CollectionVariablesFor,
  DataOf,
  MutationFragmentData,
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

interface SharedOptions {
  /** Top-level mutation field. Only needed for multi-field mutations. */
  readonly field?: string;
}

export interface OptimisticRevalidateOptions<
  TMutationData,
  TVariables extends OperationVariables,
> {
  /** Wait this many milliseconds after mutation success before revalidating. */
  readonly delay?: number;
  /** Revalidation runs without delaying the mutation result. */
  readonly mode?: "background";
  /** Override canonical collection variables, or derive them from the mutation. */
  readonly variables?:
    | CollectionVariablesFor<TMutationData>
    | ((variables: TVariables) => CollectionVariablesFor<TMutationData>);
}

export type OptimisticCreateOptions<
  TMutationData,
  TVariables extends OperationVariables,
> = MutationOptions<TMutationData, TVariables> &
  SharedOptions & {
    /** Apollo cache key field. Defaults to `id`. */
    readonly keyField?: string;
    readonly optimistic: (
      variables: TVariables
    ) => Partial<MutationFragmentData<TMutationData>>;
    readonly optimisticId?: (variables: TVariables) => string;
    /** Refetch the generated canonical collection after mutation success. */
    readonly revalidate?: OptimisticRevalidateOptions<
      TMutationData,
      TVariables
    >;
    /** Called only when background collection revalidation fails. */
    readonly onRevalidateError?: (error: Error) => void;
    /** Additional Apollo update callback, invoked after the built-in behavior. */
    readonly update?: MutationUpdate<TMutationData, TVariables>;
  };

export type OptimisticUpdateOptions<
  TMutationData,
  TVariables extends OperationVariables,
> = MutationOptions<TMutationData, TVariables> &
  SharedOptions & {
    readonly current: Partial<MutationFragmentData<TMutationData>>;
    /** Called only when background collection revalidation fails. */
    readonly onRevalidateError?: (error: Error) => void;
    readonly optimistic: (
      variables: TVariables,
      current: Readonly<Partial<MutationFragmentData<TMutationData>>>
    ) => Partial<MutationFragmentData<TMutationData>>;
    /** Refetch active instances of the generated canonical collection. */
    readonly revalidate?: OptimisticRevalidateOptions<
      TMutationData,
      TVariables
    >;
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
    /** Called only when background collection revalidation fails. */
    readonly onRevalidateError?: (error: Error) => void;
    /** Refetch active instances of the generated canonical collection. */
    readonly revalidate?: OptimisticRevalidateOptions<
      TMutationData,
      TVariables
    >;
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

const normalizeError = (cause: unknown): Error =>
  cause instanceof Error
    ? cause
    : new Error("GraphQL collection revalidation failed.", { cause });

const reportRevalidationError = (
  cause: unknown,
  onError?: (error: Error) => void
): void => {
  onError?.(normalizeError(cause));
};

const revalidateExactCollection = (
  client: ApolloClient,
  collection: CanonicalCollectionDefinition,
  variables: OperationVariables,
  onError?: (error: Error) => void
): void => {
  client
    .query({
      fetchPolicy: "network-only",
      query: collection.query,
      variables,
    })
    .catch((cause: unknown) => {
      reportRevalidationError(cause, onError);
    });
};

const revalidateActiveCollections = (
  client: ApolloClient,
  collection: CanonicalCollectionDefinition,
  onError?: (error: Error) => void
): void => {
  client
    .refetchQueries({ include: [collection.query] })
    .catch((cause: unknown) => {
      reportRevalidationError(cause, onError);
    });
};

type RevalidationVariables<TVariables extends OperationVariables> =
  | OperationVariables
  | ((variables: TVariables) => OperationVariables);

type MutationRevalidation<TVariables extends OperationVariables> =
  | {
      readonly collection: CanonicalCollectionDefinition;
      readonly delay?: number;
      readonly onError?: (error: Error) => void;
      readonly scope: "active";
      readonly variables?: undefined;
    }
  | {
      readonly collection: CanonicalCollectionDefinition;
      readonly delay?: number;
      readonly mutation: CrudMutationDefinition;
      readonly onError?: (error: Error) => void;
      readonly scope: "exact";
      readonly variables?: RevalidationVariables<TVariables>;
    };

const resolveExactRevalidationVariables = <
  TVariables extends OperationVariables,
>(
  revalidation: Extract<MutationRevalidation<TVariables>, { scope: "exact" }>,
  mutationVariables: TVariables
): OperationVariables => {
  if (typeof revalidation.variables === "function") {
    return revalidation.variables(mutationVariables);
  }
  if (revalidation.variables !== undefined) {
    return revalidation.variables;
  }
  return resolveCollectionVariables(
    revalidation.mutation.collectionVariablePaths ?? {},
    mutationVariables
  );
};

const runMutationRevalidation = <TVariables extends OperationVariables>(
  client: ApolloClient,
  revalidation: MutationRevalidation<TVariables>,
  mutationVariables: TVariables
): void => {
  if (revalidation.scope === "active") {
    revalidateActiveCollections(
      client,
      revalidation.collection,
      revalidation.onError
    );
    return;
  }
  try {
    const variables = resolveExactRevalidationVariables(
      revalidation,
      mutationVariables
    );
    revalidateExactCollection(
      client,
      revalidation.collection,
      variables,
      revalidation.onError
    );
  } catch (cause) {
    reportRevalidationError(cause, revalidation.onError);
  }
};

const validateRevalidationDelay = (delay: number | undefined): number => {
  if (delay === undefined) {
    return 0;
  }
  if (!Number.isFinite(delay) || delay < 0) {
    throw new Error("revalidate.delay must be a finite, non-negative number.");
  }
  return delay;
};

const useMutationWithRevalidation = <
  TMutationData,
  TVariables extends OperationVariables,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  >,
  apolloClient: ApolloClient,
  revalidation?: MutationRevalidation<TVariables>
) => {
  const [executeMutation, mutationResult] = useMutation(
    mutation,
    mutationOptions
  );
  const configuredVariables = mutationOptions.variables;
  const revalidationDelay = validateRevalidationDelay(revalidation?.delay);
  const executeWithRevalidation = useCallback<typeof executeMutation>(
    async (...executeArguments) => {
      const response = await executeMutation(...executeArguments);
      const [executeOptions] = executeArguments;

      if (response.error === undefined) {
        const client = executeOptions?.client ?? apolloClient;
        const mutationVariables = {
          ...configuredVariables,
          ...executeOptions?.variables,
        } as TVariables;
        if (revalidation !== undefined) {
          const runRevalidation = (): void => {
            runMutationRevalidation(client, revalidation, mutationVariables);
          };
          if (revalidationDelay === 0) {
            runRevalidation();
          } else {
            globalThis.setTimeout(runRevalidation, revalidationDelay);
          }
        }
      }

      return response;
    },
    [
      apolloClient,
      configuredVariables,
      executeMutation,
      revalidation,
      revalidationDelay,
    ]
  );

  return [executeWithRevalidation, mutationResult] as const;
};

const getCanonicalCollection = (
  cache: ApolloCache,
  operationName: string,
  responseKey: string,
  expectedKind: "create" | "delete" | "update",
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
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticCreateOptions<TMutationData, TVariables>
) => {
  const apolloClient = useApolloClient(options.client);
  const {
    field,
    keyField,
    onRevalidateError,
    optimistic,
    optimisticId = createOptimisticId,
    revalidate,
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

  const mutationOptions: useMutation.Options<
    TMutationData,
    TVariables,
    ApolloCache,
    NoConfiguredVariables
  > = {
    ...apolloOptions,
    optimisticResponse: (variables) => {
      const optimisticEntity = optimistic(variables);
      const optimisticRecord = asRecord(optimisticEntity) ?? {};
      const entity = addConventionalFields(
        {
          __typename: entitySelection.typename,
          [resolvedKeyField]:
            optimisticRecord[resolvedKeyField] ?? optimisticId(variables),
          ...optimisticRecord,
        },
        entitySelection.fields
      );

      return { [responseKey]: entity } as never;
    },
    update: (cache, result, context) => {
      const entity = readRootValue(result.data, responseKey);
      if (entity !== null && entity !== undefined) {
        const variables = resolveCollectionVariables(
          canonical.mutation.collectionVariablePaths ?? {},
          context.variables ?? {}
        );
        prependToList(
          cache,
          {
            query: canonical.collection.query,
            responseKey: canonical.collection.responseKey,
            variables,
          },
          entity
        );
      }

      update?.(cache, result, context);
    },
  };

  return useMutationWithRevalidation(
    mutation,
    mutationOptions,
    apolloClient,
    revalidate === undefined
      ? undefined
      : {
          collection: canonical.collection,
          delay: revalidate.delay,
          ...(revalidate.variables === undefined
            ? { scope: "active" as const }
            : {
                mutation: canonical.mutation,
                scope: "exact" as const,
                variables: revalidate.variables,
              }),
          onError: onRevalidateError,
        }
  );
};

export const useOptimisticUpdate = <
  TMutationData,
  TVariables extends OperationVariables,
>(
  mutation: MutationDocument<TMutationData, TVariables>,
  options: OptimisticUpdateOptions<TMutationData, TVariables>
) => {
  const apolloClient = useApolloClient(options.client);
  const {
    current,
    field,
    onRevalidateError,
    optimistic,
    revalidate,
    update,
    ...apolloOptions
  } = options;
  const operationName = getOperationName(mutation, "mutation");
  const responseKey = getRootResponseKey(mutation, "mutation", field);
  const entitySelection = getMutationEntitySelection(mutation, field);
  const currentRecord = asRecord(current) ?? {};
  const canonical =
    revalidate === undefined
      ? undefined
      : getCanonicalCollection(
          apolloClient.cache,
          operationName,
          responseKey,
          "update",
          entitySelection.typename
        );

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

  return useMutationWithRevalidation(
    mutation,
    mutationOptions,
    apolloClient,
    revalidate === undefined || canonical === undefined
      ? undefined
      : {
          collection: canonical.collection,
          delay: revalidate.delay,
          ...(revalidate.variables === undefined
            ? { scope: "active" as const }
            : {
                mutation: canonical.mutation,
                scope: "exact" as const,
                variables: revalidate.variables,
              }),
          onError: onRevalidateError,
        }
  );
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
  const {
    field,
    id,
    keyField,
    onRevalidateError,
    revalidate,
    update,
    ...apolloOptions
  } = options;
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

      const fallbackId = id(variables);
      const resultId = readRootValue(result.data, responseKey);
      const deletedId = typeof resultId === "string" ? resultId : fallbackId;
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

  return useMutationWithRevalidation(
    mutation,
    mutationOptions,
    apolloClient,
    revalidate === undefined
      ? undefined
      : {
          collection: canonical.collection,
          delay: revalidate.delay,
          ...(revalidate.variables === undefined
            ? { scope: "active" as const }
            : {
                mutation: canonical.mutation,
                scope: "exact" as const,
                variables: revalidate.variables,
              }),
          onError: onRevalidateError,
        }
  );
};

export type MutationDataOf<TDocument> = DataOf<TDocument>;
export type MutationVariablesOf<TDocument> = VariablesOf<TDocument>;
