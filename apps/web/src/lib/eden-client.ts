import { treaty } from "@elysia/eden";
import { env } from "@vyrel/env/web";
import type { ServerApp } from "server/app";

const edenConfig = {
  fetch: { credentials: "include" as const },
};

const edenClient = treaty<ServerApp>(env.NEXT_PUBLIC_SERVER_URL, edenConfig);

/** Eden client with optional forwarded headers (e.g. proxy cookie forwarding). */
export function createEdenClient(
  headers?: HeadersInit,
  baseURL: string = env.NEXT_PUBLIC_SERVER_URL
) {
  if (headers === undefined && baseURL === env.NEXT_PUBLIC_SERVER_URL) {
    return edenClient;
  }

  return treaty<ServerApp>(baseURL, {
    ...edenConfig,
    ...(headers === undefined ? {} : { headers }),
  });
}
