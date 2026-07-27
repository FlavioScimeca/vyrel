import { Effect } from "effect";

import { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import { type TaskTypeDelete, taskDeleteSchema } from "../types/base.types";
import { assertTaskAccess } from "../utils/auth-api";
import { TaskValidationError } from "../utils/errors";
import { TaskRepository } from "./task.repository";

export const deleteTask = (input: TaskTypeDelete, actorUserId: string) =>
  Effect.gen(function* () {
    const safeValues = taskDeleteSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new TaskValidationError({
        issues: safeValues.error.issues,
        message: "Invalid task delete request.",
      });
    }

    const { taskId } = safeValues.data;
    const record = yield* assertTaskAccess(taskId, actorUserId);

    const objectKeys = [record.imageFull, record.imageThumb].filter(
      (key): key is string => key !== null && key.length > 0
    );

    if (objectKeys.length > 0) {
      const storage = yield* ObjectStorage;
      yield* storage
        .deleteMany(objectKeys)
        .pipe(Effect.catchAll(() => Effect.void));
    }

    const tasks = yield* TaskRepository;
    yield* tasks.deleteById(taskId);

    return taskId;
  });
