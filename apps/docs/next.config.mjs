import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();
const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
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
