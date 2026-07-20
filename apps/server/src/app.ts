import { cors } from "@elysiajs/cors";
import { env } from "@vyrel/env/server";
import { Elysia } from "elysia";
import { faviconPath } from "./lib/favicon";
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
  .get("/favicon.ico", ({ set }) => {
    set.headers["cache-control"] = "public, max-age=3600";
    return Bun.file(faviconPath);
  })
  .get("/check-bun", () => {
    // Vercel/Elysia stamp: major only (`"1.x"`); Vercel manages minor/patch.
    // https://elysiajs.com/integrations/vercel
    const [major] = Bun.version.split(".");
    return {
      bunVersion: `${major}.x`,
      version: Bun.version,
      revision: Bun.revision,
      hasBunImage: typeof Bun.Image,
      checkBunImage: typeof new Bun.Image(new Blob()),
      runtime: "bun",
    };
  })
  .get("/", () => "OK");

export const GET = app.handle;
export const POST = app.handle;
export const PATCH = app.handle;
export const DELETE = app.handle;
export const PUT = app.handle;

export type ServerApp = typeof app;
