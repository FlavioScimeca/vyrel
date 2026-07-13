import { treaty } from "@elysia/eden";
import { env } from "@vyrel/env/web";
import type { ServerApp } from "server/app";

const edenConfig = {
  fetch: { credentials: "include" as const },
};

const edenClient = treaty<ServerApp>(env.NEXT_PUBLIC_SERVER_URL, edenConfig);

/** Eden client with optional forwarded headers (e.g. proxy cookie forwarding). */
export function createEdenClient(headers?: HeadersInit) {
  if (headers === undefined) {
    return edenClient;
  }

  return treaty<ServerApp>(env.NEXT_PUBLIC_SERVER_URL, {
    ...edenConfig,
    headers,
  });
}
