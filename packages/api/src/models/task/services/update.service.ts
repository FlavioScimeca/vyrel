import { db } from "@vyrel/db";
import { task, taskLabelAssignment } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { type TaskTypeUpdate, taskUpdateSchema } from "../types/base.types";
import { assertTaskAccess } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";
import { uploadTaskImage } from "./image.service";
import { validateTaskRelations } from "./task-relations.service";

type TaskUpdates = {
  assigneeId?: string | null;
  description?: string | null;
  dueDate?: string | null;
  imageAssetId?: string | null;
  imageFull?: string | null;
  imagePlaceholder?: string | null;
  imageThumb?: string | null;
  priority?: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  title?: string;
};

const buildTaskUpdates = (
  values: TaskTypeUpdate,
  validatedAssigneeId: string | null
): TaskUpdates => {
  const updates: TaskUpdates = {};
  if (values.title !== undefined) {
    updates.title = values.title;
  }
  if (values.description !== undefined) {
    updates.description =
      values.description.length > 0 ? values.description : null;
  }
  if (values.assigneeId !== undefined) {
    updates.assigneeId = validatedAssigneeId;
  }
  if (values.dueDate !== undefined) {
    updates.dueDate = values.dueDate;
  }
  if (values.priority !== undefined) {
    updates.priority = values.priority;
  }
  if (values.status !== undefined) {
    updates.status = values.status;
  }
  if (values.removeImage === true) {
    updates.imageAssetId = null;
    updates.imageFull = null;
    updates.imagePlaceholder = null;
    updates.imageThumb = null;
  }
  return updates;
};

const persistTaskChanges = async ({
  labelIds,
  taskId,
  updates,
}: {
  labelIds: string[] | undefined;
  taskId: string;
  updates: TaskUpdates;
}): Promise<void> => {
  if (Object.keys(updates).length === 0 && labelIds === undefined) {
    return;
  }

  await db.transaction(async (transaction) => {
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

      if (labelIds.length > 0) {
        await transaction.insert(taskLabelAssignment).values(
          labelIds.map((labelId) => ({
            labelId,
            taskId,
          }))
        );
      }
    }
  });
};

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
      removeImage,
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

    const updates = buildTaskUpdates(
      {
        assigneeId,
        description,
        dueDate,
        image,
        labelIds,
        priority,
        removeImage,
        status,
        taskId,
        title,
      },
      taskRelations.assigneeId
    );

    if (image !== undefined) {
      const imageFields = yield* uploadTaskImage(taskId, image);
      Object.assign(updates, imageFields);
    }

    yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to update task.",
        }),
      try: () =>
        persistTaskChanges({
          labelIds: labelIds === undefined ? undefined : taskRelations.labelIds,
          taskId,
          updates,
        }),
    });

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
