import "@vyrel/env/web";
import type { NextConfig } from "next";
import { createBackendRewrites } from "./src/lib/backend-rewrites";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // cacheComponents: true,
  reactCompiler: true,
  serverExternalPackages: ["libsql", "@libsql/client"],
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true,
    // tsconfigPath: "./tsconfig.json",
  },
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    useTypeScriptCli: true,
  },
  transpilePackages: ["@vyrel/shared"],
  async rewrites() {
    return createBackendRewrites(serverUrl);
  },
};

export default nextConfig;
