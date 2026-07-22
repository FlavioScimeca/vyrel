import { db } from "@vyrel/db";
import { task } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";

import { assertOrganizationMember } from "../../organization/utils/auth-api";
import { resolveAuthenticatedUserId } from "../../user/utils/auth-api";
import {
  TaskForbiddenError,
  TaskNotFoundError,
  TaskRepositoryError,
} from "./errors";

class TaskInaccessibleError extends Data.TaggedError("TaskInaccessibleError")<{
  readonly id: string;
}> {}

export const resolveActorUserId = (
  headers: Headers,
  actorUserId?: string | null
) =>
  Effect.gen(function* () {
    const userId = yield* resolveAuthenticatedUserId(headers, actorUserId);

    if (userId === null) {
      return yield* new TaskForbiddenError({
        message: "Authentication required.",
      });
    }

    return userId;
  });

export const assertOrgMembership = (organizationId: string, userId: string) =>
  assertOrganizationMember(organizationId, userId).pipe(
    Effect.mapError((error) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "_tag" in error &&
        error._tag === "OrganizationInaccessibleError"
      ) {
        return new TaskForbiddenError({
          message: "You are not a member of this organization.",
        });
      }

      return new TaskRepositoryError({
        cause: error,
        message: "Unable to verify organization membership.",
      });
    })
  );

export const fetchTaskById = (id: string) =>
  Effect.tryPromise({
    catch: (cause) =>
      new TaskRepositoryError({
        cause,
        message: "Unable to load task.",
      }),
    try: () => db.select().from(task).where(eq(task.id, id)).get(),
  });

export const assertTaskAccess = (taskId: string, userId: string) =>
  Effect.gen(function* () {
    const record = yield* fetchTaskById(taskId);

    if (record === undefined) {
      return yield* new TaskNotFoundError({ id: taskId });
    }

    yield* assertOrgMembership(record.organizationId, userId);

    return record;
  });

export const fetchTaskForUser = (
  id: string,
  headers: Headers,
  actorUserId?: string | null
) =>
  Effect.gen(function* () {
    const userId = yield* resolveActorUserId(headers, actorUserId);
    const record = yield* fetchTaskById(id);

    if (record === undefined) {
      return yield* new TaskInaccessibleError({ id });
    }

    yield* assertOrgMembership(record.organizationId, userId);

    return record;
  }).pipe(
    Effect.catchTag("TaskInaccessibleError", () => Effect.succeed(null)),
    Effect.catchTag("TaskForbiddenError", () => Effect.succeed(null))
  );
