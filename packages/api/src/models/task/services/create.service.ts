import { db } from "@vyrel/db";
import { task } from "@vyrel/db/schema";
import { Effect } from "effect";

import { type TaskTypeCreate, taskCreateSchema } from "../types/base.types";
import { assertOrgMembership } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";
import { uploadTaskImage } from "./image.service";

export const createTask = (input: TaskTypeCreate, actorUserId: string) =>
  Effect.gen(function* () {
    const safeValues = taskCreateSchema.safeParse(input);
    if (!safeValues.success) {
      return yield* new TaskValidationError({
        issues: safeValues.error.issues,
        message: "Invalid task values.",
      });
    }

    const { description, image, organizationId, title } = safeValues.data;
    yield* assertOrgMembership(organizationId, actorUserId);

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
        db
          .insert(task)
          .values({
            createdById: actorUserId,
            description: description ?? null,
            id: taskId,
            organizationId,
            title,
            ...imageFields,
          })
          .returning()
          .get(),
    });

    if (record === undefined) {
      return yield* new TaskRepositoryError({
        cause: null,
        message: "Task was not created.",
      });
    }

    return record;
  });
