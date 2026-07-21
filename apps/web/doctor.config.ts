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
    overrides: [
      {
        // Only consumed by ignored UI (scene-container / vortex).
        files: ["src/hooks/use-shadcn-theme.ts"],
        rules: ["deslop/unused-file"],
      },
      {
        // createObjectURL must be memoized by file identity; Compiler can't infer that.
        files: ["src/hooks/use-object-url.ts"],
        rules: ["react-doctor/react-compiler-no-manual-memoization"],
      },
    ],
  },
});
