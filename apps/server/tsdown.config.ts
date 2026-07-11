import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: false,
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  deps: {
    onlyBundle: false,
    skipNodeModulesBundle: true,
  },
});
