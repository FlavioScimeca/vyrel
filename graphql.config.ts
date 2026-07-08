import type { IGraphQLConfig } from "graphql-config";

const config: IGraphQLConfig = {
  extensions: {
    pluckConfig: {
      globalGqlIdentifierName: ["graphql"],
    },
  },
  schema: "apps/web/schema.graphql",
};

export default config;
