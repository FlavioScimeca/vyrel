import { initializeDrizzleGraphqlBridge as initializeDrizzleGraphqlBridgeImpl } from "./lib/define-drizzle-graphql-fields";

export const initializeDrizzleGraphqlBridge =
  initializeDrizzleGraphqlBridgeImpl;

export type {
  DefineDrizzleGraphqlFieldsConfig,
  DrizzleGraphqlBridge,
  DrizzleGraphqlFields,
  InitializeDrizzleGraphqlBridgeOptions,
} from "./lib/define-drizzle-graphql-fields";
