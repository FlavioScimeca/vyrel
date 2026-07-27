import { db } from "@vyrel/db";
import { member, taskLabel, taskLabelAssignment } from "@vyrel/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";

import type {
  TaskLabelTypeCreate,
  TaskLabelTypeDelete,
  TaskLabelTypeUpdate,
} from "../types/base.types";
import { assertOrgMembership } from "../utils/auth-api";
import {
  TaskForbiddenError,
  TaskNotFoundError,
  TaskRepositoryError,
} from "../utils/errors";

const fetchLabel = (labelId: string) =>
  Effect.tryPromise({
    catch: (cause) =>
      new TaskRepositoryError({
        cause,
        message: "Unable to load task label.",
      }),
    try: () =>
      db.select().from(taskLabel).where(eq(taskLabel.id, labelId)).get(),
  });

const assertLabelManager = (organizationId: string, actorUserId: string) =>
  Effect.gen(function* () {
    const membership = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to verify label permissions.",
        }),
      try: () =>
        db
          .select({ role: member.role })
          .from(member)
          .where(
            and(
              eq(member.organizationId, organizationId),
              eq(member.userId, actorUserId)
            )
          )
          .get(),
    });

    const roles = membership?.role.split(",") ?? [];
    if (!roles.some((role) => role === "owner" || role === "admin")) {
      return yield* new TaskForbiddenError({
        message: "Only organization owners and admins can manage labels.",
      });
    }
  });

export const listLabelsForTask = (taskId: string) =>
  Effect.tryPromise({
    catch: (cause) =>
      new TaskRepositoryError({
        cause,
        message: "Unable to load labels for task.",
      }),
    try: () =>
      db
        .select({
          color: taskLabel.color,
          createdAt: taskLabel.createdAt,
          id: taskLabel.id,
          name: taskLabel.name,
          organizationId: taskLabel.organizationId,
        })
        .from(taskLabelAssignment)
        .innerJoin(taskLabel, eq(taskLabel.id, taskLabelAssignment.labelId))
        .where(eq(taskLabelAssignment.taskId, taskId))
        .all(),
  });

export const listTaskLabels = (organizationId: string, actorUserId: string) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(organizationId, actorUserId);
    return yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to load task labels.",
        }),
      try: () =>
        db
          .select()
          .from(taskLabel)
          .where(eq(taskLabel.organizationId, organizationId))
          .orderBy(asc(taskLabel.name))
          .all(),
    });
  });

export const createTaskLabel = (
  input: TaskLabelTypeCreate,
  actorUserId: string
) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(input.organizationId, actorUserId);
    const labelId = yield* Effect.sync(() => Bun.randomUUIDv7());
    return yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to create task label.",
        }),
      try: () =>
        db
          .insert(taskLabel)
          .values({
            color: input.color.toUpperCase(),
            id: labelId,
            name: input.name,
            organizationId: input.organizationId,
          })
          .returning()
          .get(),
    });
  });

export const updateTaskLabel = (
  input: TaskLabelTypeUpdate,
  actorUserId: string
) =>
  Effect.gen(function* () {
    const existing = yield* fetchLabel(input.labelId);
    if (existing === undefined) {
      return yield* new TaskNotFoundError({ id: input.labelId });
    }
    yield* assertLabelManager(existing.organizationId, actorUserId);

    yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to update task label.",
        }),
      try: () =>
        db
          .update(taskLabel)
          .set({
            color: input.color?.toUpperCase(),
            name: input.name,
          })
          .where(eq(taskLabel.id, input.labelId))
          .run(),
    });

    const updated = yield* fetchLabel(input.labelId);
    if (updated === undefined) {
      return yield* new TaskNotFoundError({ id: input.labelId });
    }
    return updated;
  });

export const deleteTaskLabel = (
  input: TaskLabelTypeDelete,
  actorUserId: string
) =>
  Effect.gen(function* () {
    const existing = yield* fetchLabel(input.labelId);
    if (existing === undefined) {
      return yield* new TaskNotFoundError({ id: input.labelId });
    }
    yield* assertLabelManager(existing.organizationId, actorUserId);
    yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to delete task label.",
        }),
      try: () =>
        db.delete(taskLabel).where(eq(taskLabel.id, input.labelId)).run(),
    });
    return input.labelId;
  });
