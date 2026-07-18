import {
  configureGraphqlClientCache as configureGraphqlClientCacheImplementation,
  defineGraphqlClientRegistry as defineGraphqlClientRegistryImplementation,
} from "./registry";

export const configureGraphqlClientCache =
  configureGraphqlClientCacheImplementation;
export const defineGraphqlClientRegistry =
  defineGraphqlClientRegistryImplementation;

export type {
  CanonicalCollectionDefinition,
  CrudMutationDefinition,
  GraphqlClientRegistry,
} from "./registry";
