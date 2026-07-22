import { db } from "@vyrel/db";
import { task } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { type TaskTypeUpdate, taskUpdateSchema } from "../types/base.types";
import { assertTaskAccess, resolveActorUserId } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";
import { uploadTaskImage } from "./image.service";

export const updateTask = (
  input: TaskTypeUpdate,
  headers: Headers,
  actorUserId?: string | null
) =>
  Effect.gen(function* () {
    const safeValues = taskUpdateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new TaskValidationError({
        issues: safeValues.error.issues,
        message: "Invalid task update values.",
      });
    }

    const { description, image, taskId, title } = safeValues.data;
    const userId = yield* resolveActorUserId(headers, actorUserId);

    yield* assertTaskAccess(taskId, userId);

    const updates: {
      description?: string | null;
      title?: string;
      imageAssetId?: string;
      imageFull?: string;
      imagePlaceholder?: string;
      imageThumb?: string;
    } = {};

    if (title !== undefined) {
      updates.title = title;
    }

    if (description !== undefined) {
      updates.description = description.length > 0 ? description : null;
    }

    if (image !== undefined) {
      const imageFields = yield* uploadTaskImage(taskId, image);
      Object.assign(updates, imageFields);
    }

    if (Object.keys(updates).length > 0) {
      yield* Effect.tryPromise({
        catch: (cause) =>
          new TaskRepositoryError({
            cause,
            message: "Unable to update task.",
          }),
        try: () =>
          db.update(task).set(updates).where(eq(task.id, taskId)).run(),
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
