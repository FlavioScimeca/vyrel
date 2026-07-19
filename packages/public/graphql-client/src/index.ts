import {
  useOptimisticCreate as useOptimisticCreateImplementation,
  useOptimisticDelete as useOptimisticDeleteImplementation,
  useOptimisticUpdate as useOptimisticUpdateImplementation,
} from "./hooks";
export const useOptimisticCreate = useOptimisticCreateImplementation;
export const useOptimisticDelete = useOptimisticDeleteImplementation;
export const useOptimisticUpdate = useOptimisticUpdateImplementation;

export type {
  MutationDataOf,
  MutationVariablesOf,
  OptimisticCreateOptions,
  OptimisticDeleteOptions,
  OptimisticRevalidateOptions,
  OptimisticUpdateOptions,
} from "./hooks";
export type {
  ArrayFieldKey,
  ArrayItemAt,
  CollectionVariablesFor,
  DataOf,
  FragmentDataOf,
  FragmentTypeRegistry,
  MutationCollectionVariablesRegistry,
  MutationFragmentData,
  UnmaskedDataOf,
  VariablesOf,
} from "./types";
