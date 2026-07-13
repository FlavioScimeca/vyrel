import { cors } from "@elysiajs/cors";
import { auth } from "@vyrel/auth";
import { env } from "@vyrel/env/server";
import { Elysia } from "elysia";
import { graphqlPlugin } from "./plugins/graphql";
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
  .all("/api/auth/*", (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  .get("/", () => "OK");

export type ServerApp = typeof app;
