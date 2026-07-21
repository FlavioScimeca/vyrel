import { cors } from "@elysiajs/cors";
import { env } from "@vyrel/env/server";
import { Elysia } from "elysia";
import "./lib/bun-porting";
import { getFaviconPath } from "./lib/favicon";
import { authPlugin } from "./plugins/auth";
import { graphqlPlugin } from "./plugins/graphql";
import { organizationRestPlugin } from "./plugins/organization-rest";
import { userRestPlugin } from "./plugins/user-rest";

export const app = new Elysia()
  .use(
    cors({
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      origin: env.CORS_ORIGIN,
    })
  )
  .use(graphqlPlugin)
  .use(userRestPlugin)
  .use(organizationRestPlugin)
  .use(authPlugin)
  .get("/favicon.ico", async ({ set }) => {
    set.headers["cache-control"] = "public, max-age=3600";
    try {
      return Bun.file(await getFaviconPath());
    } catch {
      set.status = 404;
      return "Not Found";
    }
  })
  .get("/", () => "OK");

export const GET = app.handle;
export const POST = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
export const PUT = app.handle;

export type ServerApp = typeof app;
