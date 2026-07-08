import { graphqlYogaServer } from "@vyrel/graphql";
import { Elysia } from "elysia";

/**
 * Forward the original request URL to Yoga. Do not use `.mount('/api/graphql', …)`:
 * Elysia strips the mount prefix, so Yoga would see `/` while `graphqlEndpoint` is
 * `/api/graphql` and respond with 404.
 */
export const graphqlPlugin = new Elysia({ name: "graphql" }).all(
  "/api/graphql",
  ({ request }) => graphqlYogaServer.fetch(request),
  { parse: "none" }
);
