import { db } from "@vyrel/db";
import { task, taskLabelAssignment } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { type TaskTypeUpdate, taskUpdateSchema } from "../types/base.types";
import { assertTaskAccess } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";
import { uploadTaskImage } from "./image.service";
import { validateTaskRelations } from "./task-relations.service";

export const updateTask = (input: TaskTypeUpdate, actorUserId: string) =>
  Effect.gen(function* () {
    const safeValues = taskUpdateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new TaskValidationError({
        issues: safeValues.error.issues,
        message: "Invalid task update values.",
      });
    }

    const {
      assigneeId,
      description,
      dueDate,
      image,
      labelIds,
      priority,
      status,
      taskId,
      title,
    } = safeValues.data;
    const existingTask = yield* assertTaskAccess(taskId, actorUserId);
    const taskRelations = yield* validateTaskRelations(
      existingTask.organizationId,
      assigneeId === undefined ? existingTask.assigneeId : assigneeId,
      labelIds
    );

    const updates: {
      description?: string | null;
      assigneeId?: string | null;
      dueDate?: string | null;
      title?: string;
      imageAssetId?: string;
      imageFull?: string;
      imagePlaceholder?: string;
      imageThumb?: string;
      priority?: "NONE" | "LOW" | "MEDIUM" | "HIGH";
      status?: "TODO" | "IN_PROGRESS" | "DONE";
    } = {};

    if (title !== undefined) {
      updates.title = title;
    }

    if (description !== undefined) {
      updates.description = description.length > 0 ? description : null;
    }

    if (assigneeId !== undefined) {
      updates.assigneeId = taskRelations.assigneeId;
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate;
    }

    if (priority !== undefined) {
      updates.priority = priority;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    if (image !== undefined) {
      const imageFields = yield* uploadTaskImage(taskId, image);
      Object.assign(updates, imageFields);
    }

    if (Object.keys(updates).length > 0 || labelIds !== undefined) {
      yield* Effect.tryPromise({
        catch: (cause) =>
          new TaskRepositoryError({
            cause,
            message: "Unable to update task.",
          }),
        try: () =>
          db.transaction(async (transaction) => {
            if (Object.keys(updates).length > 0) {
              await transaction
                .update(task)
                .set(updates)
                .where(eq(task.id, taskId))
                .run();
            }

            if (labelIds !== undefined) {
              await transaction
                .delete(taskLabelAssignment)
                .where(eq(taskLabelAssignment.taskId, taskId))
                .run();

              if (taskRelations.labelIds.length > 0) {
                await transaction.insert(taskLabelAssignment).values(
                  taskRelations.labelIds.map((labelId) => ({
                    labelId,
                    taskId,
                  }))
                );
              }
            }
          }),
      });
    }

    const record = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to load updated task.",
        }),
      try: () => db.select().from(task).where(eq(task.id, taskId)).get(),
    });

    if (record === undefined) {
      return yield* new TaskRepositoryError({
        cause: null,
        message: "Task was not updated.",
      });
    }

    return record;
  });
