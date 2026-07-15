import "@vyrel/env/web";
import type { NextConfig } from "next";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["libsql", "@libsql/client"],
  typedRoutes: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        destination: `${serverUrl}/api/auth/:path*`,
        source: "/api/auth/:path*",
      },
      {
        destination: `${serverUrl}/api/users`,
        source: "/api/users",
      },
    ];
  },
};

export default nextConfig;
