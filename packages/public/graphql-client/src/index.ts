import {
  useOptimisticCreate as useOptimisticCreateImplementation,
  useOptimisticDelete as useOptimisticDeleteImplementation,
  useOptimisticUpdate as useOptimisticUpdateImplementation,
} from "./hooks";
import { useCollectionQuery as useCollectionQueryImplementation } from "./query";
export const useCollectionQuery = useCollectionQueryImplementation;
export const useOptimisticCreate = useOptimisticCreateImplementation;
export const useOptimisticDelete = useOptimisticDeleteImplementation;
export const useOptimisticUpdate = useOptimisticUpdateImplementation;
export type { CollectionHandle, CollectionMatch } from "./collection";

export type {
  MutationDataOf,
  MutationVariablesOf,
  OptimisticCreateOptions,
  OptimisticDeleteOptions,
  OptimisticUpdateOptions,
} from "./hooks";
export type {
  CollectionItemOf,
  CollectionQueryOptions,
} from "./query";
export type {
  ArrayFieldKey,
  ArrayItemAt,
  DataOf,
  FragmentDataOf,
  FragmentTypeRegistry,
  MutationFragmentData,
  UnmaskedDataOf,
  VariablesOf,
} from "./types";
