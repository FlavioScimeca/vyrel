import { db } from "@vyrel/db";
import { task, taskLabelAssignment } from "@vyrel/db/schema";
import { Effect } from "effect";

import { type TaskTypeCreate, taskCreateSchema } from "../types/base.types";
import { assertOrgMembership } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";
import { uploadTaskImage } from "./image.service";
import { validateTaskRelations } from "./task-relations.service";

export const createTask = (input: TaskTypeCreate, actorUserId: string) =>
  Effect.gen(function* () {
    const safeValues = taskCreateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new TaskValidationError({
        issues: safeValues.error.issues,
        message: "Invalid task values.",
      });
    }

    const {
      assigneeId,
      description,
      dueDate,
      image,
      labelIds,
      organizationId,
      priority,
      status,
      title,
    } = safeValues.data;
    yield* assertOrgMembership(organizationId, actorUserId);
    const taskRelations = yield* validateTaskRelations(
      organizationId,
      assigneeId,
      labelIds
    );

    const taskId = yield* Effect.sync(() => Bun.randomUUIDv7());

    const imageFields =
      image === undefined
        ? {
            imageAssetId: null,
            imageFull: null,
            imagePlaceholder: null,
            imageThumb: null,
          }
        : yield* uploadTaskImage(taskId, image);

    const record = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to create task.",
        }),
      try: () =>
        db.transaction(async (transaction) => {
          const createdTask = await transaction
            .insert(task)
            .values({
              assigneeId: taskRelations.assigneeId,
              createdById: actorUserId,
              description: description ?? null,
              dueDate: dueDate ?? null,
              id: taskId,
              organizationId,
              priority: priority ?? "NONE",
              status: status ?? "TODO",
              title,
              ...imageFields,
            })
            .returning()
            .get();

          if (taskRelations.labelIds.length > 0) {
            await transaction.insert(taskLabelAssignment).values(
              taskRelations.labelIds.map((labelId) => ({
                labelId,
                taskId,
              }))
            );
          }

          return createdTask;
        }),
    });

    if (record === undefined) {
      return yield* new TaskRepositoryError({
        cause: null,
        message: "Task was not created.",
      });
    }

    return record;
  });
