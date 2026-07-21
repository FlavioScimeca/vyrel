import { db } from "@vyrel/db";
import { task } from "@vyrel/db/schema";
import { and, desc, eq, gte, lte, or, type SQL, sql } from "drizzle-orm";
import { DateTime, Effect } from "effect";

import type {
  TasksTypeByOrganization,
  TaskTypeById,
} from "../types/extra.types";
import {
  assertOrgMembership,
  fetchTaskForUser,
  resolveActorUserId,
} from "../utils/auth-api";
import { TaskRepositoryError } from "../utils/errors";

export const getTask = (
  input: TaskTypeById,
  headers: Headers,
  jwtUserId?: string
) => fetchTaskForUser(input.id, headers, jwtUserId);

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

  return conditions;
};

export const listTasksByOrganization = (
  input: TasksTypeByOrganization,
  headers: Headers,
  jwtUserId?: string
) =>
  Effect.gen(function* () {
    const userId = yield* resolveActorUserId(headers, jwtUserId);

    yield* assertOrgMembership(input.organizationId, userId);

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
          .orderBy(desc(task.createdAt))
          .all(),
    });
  });
