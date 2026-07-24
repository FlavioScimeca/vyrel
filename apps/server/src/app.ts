import { cors } from "@elysiajs/cors";
import { env } from "@vyrel/env/server";
import { createVyrelElysiaPlugin } from "@vyrel/logging/elysia";
import { Effect } from "effect";
import { Elysia } from "elysia";
import "./lib/bun-porting";
import { getFaviconPath, runFavicon } from "./lib/favicon";
import { authPlugin } from "./plugins/auth";
import { graphqlPlugin } from "./plugins/graphql";
import { organizationRestPlugin } from "./plugins/organization-rest";
import { userRestPlugin } from "./plugins/user-rest";

const isDevelopment = env.NODE_ENV === "development";

const corsOrigins = isDevelopment
  ? [
      env.CORS_ORIGIN,
      "http://localhost:3000",
      "http://10.0.2.2:3000",
      "mobile://",
    ]
  : env.CORS_ORIGIN;

export const app = new Elysia()
  .use(createVyrelElysiaPlugin({ service: "vyrel-server" }))
  .use(
    cors({
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Cookie",
        "expo-origin",
        "x-skip-oauth-proxy",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      origin: corsOrigins,
    })
  )
  .use(graphqlPlugin)
  .use(userRestPlugin)
  .use(organizationRestPlugin)
  .use(authPlugin)
  .get("/favicon.ico", ({ set }) => {
    set.headers["cache-control"] = "public, max-age=3600";
    // runPromise belongs here (handler edge), not at module top-level
    return runFavicon(
      Effect.gen(function* () {
        const path = yield* getFaviconPath;
        return Bun.file(path);
      }).pipe(
        Effect.catchAll(() => {
          set.status = 404;
          return Effect.succeed("Not Found");
        })
      )
    );
  })
  .get("/", () => "OK");

export const GET = app.handle;
export const POST = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
export const PUT = app.handle;

export type ServerApp = typeof app;
