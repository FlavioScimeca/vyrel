import { defineConfig } from "react-doctor/api";

export default defineConfig({
  verbose: true,
  ignore: {
    files: [
      "src/components/ui/**",
      "src/graphql/generated/**",
      "graphql-env.d.ts",
      ".storybook/**",
    ],
  },
});
