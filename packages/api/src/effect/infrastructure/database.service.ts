import { db } from "@vyrel/db";
import { Effect } from "effect";

export type DatabaseClient = typeof db;

export class Database extends Effect.Service<Database>()("Database", {
  succeed: {
    client: db,
  },
}) {}
