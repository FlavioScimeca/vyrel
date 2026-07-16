import { cors } from "@elysiajs/cors";
import { env } from "@vyrel/env/server";
import { Elysia } from "elysia";
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
  .get("/", () => "OK");

export type ServerApp = typeof app;
