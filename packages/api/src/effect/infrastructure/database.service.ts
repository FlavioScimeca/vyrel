import { db } from "@vyrel/db";
import { Effect } from "effect";

export type DatabaseClient = typeof db;

export class Database extends Effect.Service<Database>()(
  "@vyrel/api/effect/infrastructure/database.service/Database",
  {
    succeed: {
      client: db,
    },
  }
) {}
