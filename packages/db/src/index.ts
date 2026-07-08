import { createClient } from "@libsql/client";
import { getLogger } from "@logtape/drizzle-orm";
import { env } from "@vyrel/env/server";
import { drizzle } from "drizzle-orm/libsql";

import { relations } from "./relations";

const client = createClient({
  authToken: env.DATABASE_AUTH_TOKEN,
  url: env.DATABASE_URL,
});

export const db = drizzle({
  client,
  logger: getLogger({ category: ["vyrel", "database"] }),
  relations,
});
