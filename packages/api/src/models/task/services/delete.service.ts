import { db } from "@vyrel/db";
import { task } from "@vyrel/db/schema";
import { deleteObjects } from "@vyrel/storage/object-storage";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { type TaskTypeDelete, taskDeleteSchema } from "../types/base.types";
import { assertTaskAccess, resolveActorUserId } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";

export const deleteTask = (
  input: TaskTypeDelete,
  headers: Headers,
  jwtUserId?: string
) =>
  Effect.gen(function* () {
    const safeValues = taskDeleteSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new TaskValidationError({
        issues: safeValues.error.issues,
        message: "Invalid task delete request.",
      });
    }

    const { taskId } = safeValues.data;
    const userId = yield* resolveActorUserId(headers, jwtUserId);
    const record = yield* assertTaskAccess(taskId, userId);

    const objectKeys = [record.imageFull, record.imageThumb].filter(
      (key): key is string => key !== null && key.length > 0
    );

    if (objectKeys.length > 0) {
      yield* deleteObjects(objectKeys).pipe(Effect.catchAll(() => Effect.void));
    }

    yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to delete task.",
        }),
      try: () => db.delete(task).where(eq(task.id, taskId)).run(),
    });

    return taskId;
  });
