import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { Config, Effect, Option } from "effect";

dotenv.config({
  path: "../../apps/server/.env",
});

const dbCredentials = Effect.runSync(
  Effect.all({
    authToken: Config.option(Config.string("DATABASE_AUTH_TOKEN")).pipe(
      Config.map(Option.getOrUndefined)
    ),
    url: Config.string("DATABASE_URL").pipe(Config.withDefault("")),
  })
);

export default defineConfig({
  dbCredentials,
  dialect: "turso",
  out: "./src/migrations",
  schema: "./src/schemas/*.schema.ts",
});
