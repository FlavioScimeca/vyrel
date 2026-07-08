import { createClient } from "@libsql/client";
import { env } from "@vyrel/env/server";
import { drizzle } from "drizzle-orm/libsql";

import { schema } from "./schema/index";

const client = createClient({
  authToken: env.DATABASE_AUTH_TOKEN,
  url: env.DATABASE_URL,
});

export const db = drizzle({ client, schema });
