import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { nowDate } from "../lib/now-date";
import { user } from "./auth.schema";
import { organization } from "./organization.schema";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
export const TASK_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH"] as const;

export const task = sqliteTable(
  "task",
  {
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
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
    dueDate: text("due_date"),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    priority: text("priority", { enum: TASK_PRIORITIES })
      .default("NONE")
      .notNull(),
    status: text("status", { enum: TASK_STATUSES }).default("TODO").notNull(),
    title: text("title").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(nowDate)
      .notNull(),
  },
  (table) => [
    index("task_organizationId_idx").on(table.organizationId),
    index("task_createdById_idx").on(table.createdById),
    index("task_assigneeId_idx").on(table.assigneeId),
    index("task_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("task_organizationId_dueDate_idx").on(
      table.organizationId,
      table.dueDate
    ),
  ]
);

export const taskLabel = sqliteTable(
  "task_label",
  {
    color: text("color").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("taskLabel_organizationId_idx").on(table.organizationId),
    uniqueIndex("taskLabel_organizationId_name_unique").on(
      table.organizationId,
      table.name
    ),
  ]
);

export const taskLabelAssignment = sqliteTable(
  "task_label_assignment",
  {
    labelId: text("label_id")
      .notNull()
      .references(() => taskLabel.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.taskId, table.labelId] }),
    index("taskLabelAssignment_labelId_idx").on(table.labelId),
  ]
);
