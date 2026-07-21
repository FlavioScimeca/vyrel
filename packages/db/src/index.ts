import { createClient } from "@libsql/client";
import { env } from "@vyrel/env/server";
import { createDrizzleLogger } from "@vyrel/logging/drizzle";
import { drizzle } from "drizzle-orm/libsql";

import { relations } from "./relations";

const client = createClient({
  authToken: env.DATABASE_AUTH_TOKEN,
  url: env.DATABASE_URL,
});

export const db = drizzle({
  client,
  logger: createDrizzleLogger("database"),
  relations,
});
