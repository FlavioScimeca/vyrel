import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  documents: ["src/**/*.{ts,tsx}", "!src/graphql/generated/**"],
  generates: {
    "src/graphql/generated/client-schema.ts": {
      plugins: [
        {
          "@vyrel/graphql-client/codegen-plugin": {
            scalars: {
              DateTime: "string",
              File: "unknown",
              JSON: "unknown",
              LocalDate: "string",
              URL: "string",
            },
          },
        },
      ],
    },
  },
  pluckConfig: {
    globalGqlIdentifierName: ["graphql"],
  },
  schema: "schema.graphql",
};

export default config;
