import {
  collectionOverrideWhen as collectionOverrideWhenImplementation,
  prependToCollectionVariant as prependToCollectionVariantImplementation,
  removeFromCollectionVariant as removeFromCollectionVariantImplementation,
} from "./collection";
import {
  configureGraphqlClientCache as configureGraphqlClientCacheImplementation,
  defineGraphqlClientRegistry as defineGraphqlClientRegistryImplementation,
} from "./registry";

export const collectionOverrideWhen = collectionOverrideWhenImplementation;
export const configureGraphqlClientCache =
  configureGraphqlClientCacheImplementation;
export const defineGraphqlClientRegistry =
  defineGraphqlClientRegistryImplementation;
export const prependToCollectionVariant =
  prependToCollectionVariantImplementation;
export const removeFromCollectionVariant =
  removeFromCollectionVariantImplementation;

export type { CollectionOverride } from "./collection";
export type {
  CanonicalCollectionDefinition,
  CrudMutationDefinition,
  GraphqlClientRegistry,
} from "./registry";
