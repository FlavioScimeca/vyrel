import {
  collectionOverrideWhen as collectionOverrideWhenImplementation,
  prependToCollectionVariant as prependToCollectionVariantImplementation,
  removeFromCollectionVariant as removeFromCollectionVariantImplementation,
} from "./collection";
import {
  useOptimisticCreate as useOptimisticCreateImplementation,
  useOptimisticDelete as useOptimisticDeleteImplementation,
  useOptimisticUpdate as useOptimisticUpdateImplementation,
} from "./hooks";

export const collectionOverrideWhen = collectionOverrideWhenImplementation;
export const prependToCollectionVariant =
  prependToCollectionVariantImplementation;
export const removeFromCollectionVariant =
  removeFromCollectionVariantImplementation;
export const useOptimisticCreate = useOptimisticCreateImplementation;
export const useOptimisticDelete = useOptimisticDeleteImplementation;
export const useOptimisticUpdate = useOptimisticUpdateImplementation;

export type { CollectionOverride } from "./collection";
export type {
  MutationDataOf,
  MutationVariablesOf,
  OptimisticCreateCollectionOption,
  OptimisticCreateCollectionOverride,
  OptimisticCreateOptions,
  OptimisticDeleteOptions,
  OptimisticUpdateOptions,
} from "./hooks";
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
