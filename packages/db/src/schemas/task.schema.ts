import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { nowDate } from "../lib/now-date";
import { user } from "./auth.schema";
import { organization } from "./organization.schema";

export const task = sqliteTable(
  "task",
  {
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    description: text("description"),
    id: text("id").primaryKey(),
    imageAssetId: text("image_asset_id"),
    imageFull: text("image_full"),
    imagePlaceholder: text("image_placeholder"),
    imageThumb: text("image_thumb"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(nowDate)
      .notNull(),
  },
  (table) => [
    index("task_organizationId_idx").on(table.organizationId),
    index("task_createdById_idx").on(table.createdById),
  ]
);
