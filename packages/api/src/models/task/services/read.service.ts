import { db } from "@vyrel/db";
import { task } from "@vyrel/db/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import type {
  TasksTypeByOrganization,
  TaskTypeById,
} from "../types/extra.types";
import {
  assertOrgMembership,
  fetchTaskForUser,
  resolveActorUserId,
} from "../utils/auth-api";
import { TaskRepositoryError } from "../utils/errors";

export const getTask = (
  input: TaskTypeById,
  headers: Headers,
  jwtUserId?: string
) => fetchTaskForUser(input.id, headers, jwtUserId);

export const listTasksByOrganization = (
  input: TasksTypeByOrganization,
  headers: Headers,
  jwtUserId?: string
) =>
  Effect.gen(function* () {
    const userId = yield* resolveActorUserId(headers, jwtUserId);

    yield* assertOrgMembership(input.organizationId, userId);

    return yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskRepositoryError({
          cause,
          message: "Unable to list tasks.",
        }),
      try: () =>
        db
          .select()
          .from(task)
          .where(eq(task.organizationId, input.organizationId))
          .all(),
    });
  });
