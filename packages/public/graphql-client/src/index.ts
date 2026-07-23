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
import { createOptimisticListIdentity as createOptimisticListIdentityImplementation } from "./optimistic-list-identity";

export const collectionOverrideWhen = collectionOverrideWhenImplementation;
export const createOptimisticListIdentity =
  createOptimisticListIdentityImplementation;
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
  CreateOptimisticListIdentityOptions,
  OptimisticListIdentity,
} from "./optimistic-list-identity";
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
