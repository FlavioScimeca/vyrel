import { treaty } from "@elysia/eden";
import { env } from "@vyrel/env/web";
import type { ServerApp } from "server/app";

export const edenClient = treaty<ServerApp>(env.NEXT_PUBLIC_SERVER_URL, {
  fetch: { credentials: "include" },
});
