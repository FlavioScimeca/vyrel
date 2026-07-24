import { db } from "@vyrel/db";
import { task, taskLabelAssignment } from "@vyrel/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { DateTime, Effect } from "effect";

import type {
  TaskConnectionInput,
  TasksTypeByOrganization,
  TaskTypeById,
} from "../types/extra.types";
import { assertOrgMembership, fetchTaskForUser } from "../utils/auth-api";
import { TaskRepositoryError } from "../utils/errors";

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

const buildTaskListConditions = (input: TasksTypeByOrganization): SQL[] => {
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
        db
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
      return [asc(task.dueDate), desc(task.createdAt), desc(task.id)] as const;
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

    const conditions = buildTaskListConditions(input);

    return yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to list tasks.",
        }),
      try: () =>
        db
          .select()
          .from(task)
          .where(and(...conditions))
          .orderBy(...taskOrderBy(input.sort))
          .all(),
    });
  });

type TaskCursor = {
  offset: number;
};

const encodeCursor = (cursor: TaskCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString("base64url");

const decodeCursor = (cursor: string | undefined): number => {
  if (cursor === undefined) {
    return 0;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as Partial<TaskCursor>;
    return typeof parsed.offset === "number" &&
      Number.isInteger(parsed.offset) &&
      parsed.offset >= 0
      ? parsed.offset
      : 0;
  } catch {
    return 0;
  }
};

export const listTaskConnection = (
  input: TaskConnectionInput,
  actorUserId: string
) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(input.organizationId, actorUserId);
    const conditions = buildTaskListConditions(input);
    const offset = decodeCursor(input.after);
    const records = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to load tasks.",
        }),
      try: () =>
        db
          .select()
          .from(task)
          .where(and(...conditions))
          .orderBy(...taskOrderBy(input.sort))
          .limit(input.first + 1)
          .offset(offset)
          .all(),
    });

    const hasNextPage = records.length > input.first;
    const nodes = hasNextPage ? records.slice(0, input.first) : records;

    return {
      nodes,
      pageInfo: {
        endCursor:
          nodes.length === 0
            ? null
            : encodeCursor({ offset: offset + nodes.length }),
        hasNextPage,
      },
    };
  });

export const getTaskSummary = (organizationId: string, actorUserId: string) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(organizationId, actorUserId);
    const today = new Date().toISOString().slice(0, 10);
    const [summary] = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to load task summary.",
        }),
      try: () =>
        db
          .select({
            done: sql<number>`sum(case when ${task.status} = 'DONE' then 1 else 0 end)`,
            inProgress: sql<number>`sum(case when ${task.status} = 'IN_PROGRESS' then 1 else 0 end)`,
            overdue: sql<number>`sum(case when ${task.status} != 'DONE' and ${task.dueDate} < ${today} then 1 else 0 end)`,
            todo: sql<number>`sum(case when ${task.status} = 'TODO' then 1 else 0 end)`,
            total: sql<number>`count(*)`,
          })
          .from(task)
          .where(eq(task.organizationId, organizationId))
          .all(),
    });

    return {
      done: Number(summary?.done ?? 0),
      inProgress: Number(summary?.inProgress ?? 0),
      overdue: Number(summary?.overdue ?? 0),
      todo: Number(summary?.todo ?? 0),
      total: Number(summary?.total ?? 0),
    };
  });
