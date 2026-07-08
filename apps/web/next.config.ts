import "@vyrel/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["libsql", "@libsql/client"],
  typedRoutes: true,
};

export default nextConfig;
