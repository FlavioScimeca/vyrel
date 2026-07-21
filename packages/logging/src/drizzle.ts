import type { Logger } from "drizzle-orm/logger";
import { log } from "evlog";

import { initLogging } from "./logging";

/**
 * Drizzle ORM logger that forwards SQL to the global evlog `log.debug` API.
 */
export function createDrizzleLogger(category = "database"): Logger {
  initLogging();

  return {
    logQuery(query: string, params: unknown[]): void {
      log.debug({
        category,
        event: "sql",
        sql: query,
        params,
      });
    },
  };
}
