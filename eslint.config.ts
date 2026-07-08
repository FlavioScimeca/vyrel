import type { ConfigWithExtends } from "@eslint/config-helpers";
import graphqlPlugin from "@graphql-eslint/eslint-plugin";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    processor: graphqlPlugin.processor,
  },
  {
    files: ["apps/web/src/**/*.{graphql,gql}"],
    languageOptions: {
      parser: graphqlPlugin.parser,
    },
    plugins: {
      // @graphql-eslint rule meta types predate ESLint 10's stricter Plugin shape.
      "@graphql-eslint": graphqlPlugin,
    },
    rules: {
      "@graphql-eslint/no-anonymous-operations": "error",
      "@graphql-eslint/no-duplicate-fields": "error",
      "@graphql-eslint/unique-argument-names": "error",
      "@graphql-eslint/unique-variable-names": "error",
    },
  } as ConfigWithExtends
);
