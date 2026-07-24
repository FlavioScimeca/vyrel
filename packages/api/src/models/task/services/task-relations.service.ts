import { db } from "@vyrel/db";
import { member, taskLabel } from "@vyrel/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";

import { TaskRepositoryError, TaskValidationError } from "../utils/errors";

type ValidatedTaskRelations = {
  assigneeId: string | null;
  labelIds: string[];
};

export const validateTaskRelations = (
  organizationId: string,
  assigneeId: string | null | undefined,
  labelIds: readonly string[] | undefined
) =>
  Effect.gen(function* () {
    const uniqueLabelIds = [...new Set(labelIds ?? [])];

    if (assigneeId !== undefined && assigneeId !== null) {
      const assigneeMembership = yield* Effect.tryPromise({
        catch: (cause) =>
          new TaskRepositoryError({
            cause,
            message: "Unable to validate task assignee.",
          }),
        try: () =>
          db
            .select({ id: member.id })
            .from(member)
            .where(
              and(
                eq(member.organizationId, organizationId),
                eq(member.userId, assigneeId)
              )
            )
            .get(),
      });

      if (assigneeMembership === undefined) {
        return yield* new TaskValidationError({
          message: "Assignee must be a member of this organization.",
        });
      }
    }

    if (uniqueLabelIds.length > 0) {
      const matchingLabels = yield* Effect.tryPromise({
        catch: (cause) =>
          new TaskRepositoryError({
            cause,
            message: "Unable to validate task labels.",
          }),
        try: () =>
          db
            .select({ id: taskLabel.id })
            .from(taskLabel)
            .where(
              and(
                eq(taskLabel.organizationId, organizationId),
                inArray(taskLabel.id, uniqueLabelIds)
              )
            )
            .all(),
      });

      if (matchingLabels.length !== uniqueLabelIds.length) {
        return yield* new TaskValidationError({
          message: "Every label must belong to this organization.",
        });
      }
    }

    return {
      assigneeId: assigneeId ?? null,
      labelIds: uniqueLabelIds,
    } satisfies ValidatedTaskRelations;
  });
