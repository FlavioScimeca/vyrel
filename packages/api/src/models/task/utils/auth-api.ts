import { Data, Effect } from "effect";

import { MembershipRepository } from "../../../effect/repositories/membership.repository";
import { TaskRepository } from "../services/task.repository";
import {
  TaskForbiddenError,
  TaskNotFoundError,
  TaskRepositoryError,
} from "./errors";

class TaskInaccessibleError extends Data.TaggedError("TaskInaccessibleError")<{
  readonly id: string;
}> {}

export const assertOrgMembership = (organizationId: string, userId: string) =>
  Effect.gen(function* () {
    const memberships = yield* MembershipRepository;
    const isMember = yield* memberships.isMember(organizationId, userId).pipe(
      Effect.mapError(
        (cause) =>
          new TaskRepositoryError({
            cause,
            message: "Unable to verify organization membership.",
          })
      )
    );

    if (!isMember) {
      return yield* new TaskForbiddenError({
        message: "You are not a member of this organization.",
      });
    }
  });

export const fetchTaskById = (id: string) =>
  Effect.gen(function* () {
    const tasks = yield* TaskRepository;
    return yield* tasks.findById(id);
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

export const fetchTaskForUser = (id: string, actorUserId: string) =>
  Effect.gen(function* () {
    const record = yield* fetchTaskById(id);

    if (record === undefined) {
      return yield* new TaskInaccessibleError({ id });
    }

    yield* assertOrgMembership(record.organizationId, actorUserId);

    return record;
  }).pipe(
    Effect.catchTags({
      TaskInaccessibleError: () => Effect.succeed(null),
      TaskForbiddenError: () => Effect.succeed(null),
    })
  );
