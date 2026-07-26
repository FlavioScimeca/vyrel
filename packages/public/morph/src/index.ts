import { initializeDrizzleGraphqlBridge as initializeDrizzleGraphqlBridgeImpl } from "./lib/define-drizzle-graphql-fields";

export const initializeDrizzleGraphqlBridge =
  initializeDrizzleGraphqlBridgeImpl;

export type {
  ConnectionPageInfo,
  ConnectionPayload,
  DefineDrizzleGraphqlFieldsConfig,
  DrizzleGraphqlBridge,
  DrizzleGraphqlFields,
  InitializeDrizzleGraphqlBridgeOptions,
  MorphConnectionOptions,
} from "./lib/define-drizzle-graphql-fields";
