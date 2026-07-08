import { initializeDrizzleGraphqlBridge } from "@vyrel/morph";
import { builder } from "./pothos";

export const graphqlBridge = initializeDrizzleGraphqlBridge(builder, {
  defaultIdFields: ["id", "orgId"],
  unmappedFields: "throw",
});
