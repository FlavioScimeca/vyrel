export type BackendRewrite = {
  destination: string;
  source: string;
};

export function createBackendRewrites(serverUrl: string): BackendRewrite[] {
  return [
    {
      destination: `${serverUrl}/api/auth/:path*`,
      source: "/api/auth/:path*",
    },
    {
      destination: `${serverUrl}/api/users`,
      source: "/api/users",
    },
    {
      destination: `${serverUrl}/api/organizations`,
      source: "/api/organizations",
    },
    {
      destination: `${serverUrl}/api/graphql`,
      source: "/api/graphql",
    },
  ];
}
