import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  // TypeScript 7 does not ship lib/typescript.js; Next's build-time check
  // requires the classic API. Typechecking runs via `check-types` (tsc) instead.
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@": projectRoot,
      collections: resolve(projectRoot, ".source"),
    };

    return webpackConfig;
  },
};

export default withMDX(config);
