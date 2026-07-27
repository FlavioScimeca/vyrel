import { task, taskLabelAssignment } from "@vyrel/db/schema";
import type { ConnectionPayload } from "@vyrel/morph";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { DateTime, Effect } from "effect";

import type { DatabaseClient } from "../../../effect/infrastructure/database.service";
import { Database } from "../../../effect/infrastructure/database.service";
import type {
  TaskConnectionInput,
  TasksTypeByOrganization,
  TaskTypeById,
} from "../types/extra.types";
import { assertOrgMembership, fetchTaskForUser } from "../utils/auth-api";
import { TaskRepository } from "./task.repository";

type TaskConnectionResult = ConnectionPayload<(typeof task)["$inferSelect"]>;

export const getTask = (input: TaskTypeById, actorUserId: string) =>
  fetchTaskForUser(input.id, actorUserId);

/** Local calendar-day bounds as absolute instants (matches former setHours behavior). */
const startOfDay = (date: Date): Date =>
  DateTime.unsafeMake(date).pipe(
    DateTime.setZone(DateTime.zoneMakeLocal()),
    DateTime.startOf("day"),
    DateTime.toDateUtc
  );

const endOfDay = (date: Date): Date =>
  DateTime.unsafeMake(date).pipe(
    DateTime.setZone(DateTime.zoneMakeLocal()),
    DateTime.endOf("day"),
    DateTime.toDateUtc
  );

const escapeLikePattern = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");

const buildTaskListConditions = (
  input: TasksTypeByOrganization,
  client: DatabaseClient
): SQL[] => {
  const conditions: SQL[] = [eq(task.organizationId, input.organizationId)];

  if (input.search !== undefined) {
    const pattern = `%${escapeLikePattern(input.search.toLowerCase())}%`;
    const searchCondition = or(
      sql`lower(${task.title}) like ${pattern} escape '\\'`,
      sql`lower(coalesce(${task.description}, '')) like ${pattern} escape '\\'`
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  if (input.createdFrom !== undefined) {
    conditions.push(gte(task.createdAt, startOfDay(input.createdFrom)));
  }

  if (input.createdTo !== undefined) {
    conditions.push(lte(task.createdAt, endOfDay(input.createdTo)));
  }

  if (input.statuses !== undefined && input.statuses.length > 0) {
    conditions.push(inArray(task.status, input.statuses));
  }

  if (input.priorities !== undefined && input.priorities.length > 0) {
    conditions.push(inArray(task.priority, input.priorities));
  }

  if (input.dueFrom !== undefined) {
    conditions.push(gte(task.dueDate, input.dueFrom));
  }

  if (input.dueTo !== undefined) {
    conditions.push(lte(task.dueDate, input.dueTo));
  }

  if (input.assigneeId !== undefined) {
    conditions.push(eq(task.assigneeId, input.assigneeId));
  }

  if (input.labelIds !== undefined && input.labelIds.length > 0) {
    conditions.push(
      inArray(
        task.id,
        client
          .select({ taskId: taskLabelAssignment.taskId })
          .from(taskLabelAssignment)
          .where(inArray(taskLabelAssignment.labelId, input.labelIds))
      )
    );
  }

  return conditions;
};

const taskOrderBy = (sort: TasksTypeByOrganization["sort"]) => {
  switch (sort) {
    case "DUE_DATE":
      return [
        sql`case when ${task.dueDate} is null then 1 else 0 end`,
        asc(task.dueDate),
        desc(task.createdAt),
        desc(task.id),
      ] as const;
    case "PRIORITY":
      return [
        sql`case ${task.priority} when 'HIGH' then 0 when 'MEDIUM' then 1 when 'LOW' then 2 else 3 end`,
        desc(task.createdAt),
        desc(task.id),
      ] as const;
    case "RECENTLY_UPDATED":
      return [desc(task.updatedAt), desc(task.id)] as const;
    default:
      return [desc(task.createdAt), desc(task.id)] as const;
  }
};

export const listTasksByOrganization = (
  input: TasksTypeByOrganization,
  actorUserId: string
) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(input.organizationId, actorUserId);
    const database = yield* Database;
    const conditions = buildTaskListConditions(input, database.client);
    const tasks = yield* TaskRepository;
    return yield* tasks.list(conditions, [...taskOrderBy(input.sort)]);
  });

type TaskCursor = {
  createdAt: string;
  dueDate: string | null;
  id: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  updatedAt: string;
};

const encodeCursor = (cursor: TaskCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString("base64url");

const decodeCursor = (cursor: string | undefined): TaskCursor | null => {
  if (cursor === undefined) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as Partial<TaskCursor>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      (parsed.dueDate !== null && typeof parsed.dueDate !== "string") ||
      !["NONE", "LOW", "MEDIUM", "HIGH"].includes(parsed.priority ?? "")
    ) {
      return null;
    }
    return parsed as TaskCursor;
  } catch {
    return null;
  }
};

const descendingDateCursorCondition = (
  column: typeof task.createdAt | typeof task.updatedAt,
  cursorDate: Date,
  cursorId: string
): SQL =>
  or(
    lt(column, cursorDate),
    and(eq(column, cursorDate), lt(task.id, cursorId))
  ) as SQL;

const priorityRank = sql<number>`case ${task.priority} when 'HIGH' then 0 when 'MEDIUM' then 1 when 'LOW' then 2 else 3 end`;

const cursorCondition = (
  cursor: TaskCursor,
  sort: TasksTypeByOrganization["sort"]
): SQL => {
  const createdAt = DateTime.toDateUtc(DateTime.unsafeMake(cursor.createdAt));
  const updatedAt = DateTime.toDateUtc(DateTime.unsafeMake(cursor.updatedAt));

  if (sort === "RECENTLY_UPDATED") {
    return descendingDateCursorCondition(task.updatedAt, updatedAt, cursor.id);
  }

  if (sort === "DUE_DATE") {
    const tieBreaker = descendingDateCursorCondition(
      task.createdAt,
      createdAt,
      cursor.id
    );
    if (cursor.dueDate === null) {
      return and(sql`${task.dueDate} is null`, tieBreaker) as SQL;
    }
    return or(
      sql`${task.dueDate} is null`,
      gt(task.dueDate, cursor.dueDate),
      and(eq(task.dueDate, cursor.dueDate), tieBreaker)
    ) as SQL;
  }

  if (sort === "PRIORITY") {
    const ranks = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 } as const;
    const cursorRank = ranks[cursor.priority];
    return or(
      gt(priorityRank, cursorRank),
      and(
        eq(priorityRank, cursorRank),
        descendingDateCursorCondition(task.createdAt, createdAt, cursor.id)
      )
    ) as SQL;
  }

  return descendingDateCursorCondition(task.createdAt, createdAt, cursor.id);
};

export const listTaskConnection = (
  input: TaskConnectionInput,
  actorUserId: string
) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(input.organizationId, actorUserId);
    const database = yield* Database;
    const conditions = buildTaskListConditions(input, database.client);
    const cursor = decodeCursor(input.after);
    if (cursor !== null) {
      conditions.push(cursorCondition(cursor, input.sort));
    }
    const tasks = yield* TaskRepository;
    const records = yield* tasks.list(
      conditions,
      [...taskOrderBy(input.sort)],
      input.first + 1
    );

    const hasNextPage = records.length > input.first;
    const nodes = hasNextPage ? records.slice(0, input.first) : records;

    return {
      nodes,
      pageInfo: {
        endCursor:
          nodes.length === 0
            ? null
            : encodeCursor({
                createdAt: nodes.at(-1)?.createdAt.toISOString() ?? "",
                dueDate: nodes.at(-1)?.dueDate ?? null,
                id: nodes.at(-1)?.id ?? "",
                priority: nodes.at(-1)?.priority ?? "NONE",
                updatedAt: nodes.at(-1)?.updatedAt.toISOString() ?? "",
              }),
        hasNextPage,
      },
    } satisfies TaskConnectionResult;
  });

export const getTaskSummary = (organizationId: string, actorUserId: string) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(organizationId, actorUserId);
    const today = DateTime.formatIsoDateUtc(DateTime.unsafeNow());
    const tasks = yield* TaskRepository;
    const summary = yield* tasks.getSummary(organizationId, today);

    return {
      done: Number(summary?.done ?? 0),
      inProgress: Number(summary?.inProgress ?? 0),
      overdue: Number(summary?.overdue ?? 0),
      todo: Number(summary?.todo ?? 0),
      total: Number(summary?.total ?? 0),
    };
  });

export const getTaskAssignee = (assigneeId: string | null) =>
  Effect.gen(function* () {
    if (assigneeId === null) {
      return null;
    }
    const tasks = yield* TaskRepository;
    const record = yield* tasks.findUserById(assigneeId);
    return record ?? null;
  });
