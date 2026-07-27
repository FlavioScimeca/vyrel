import { Effect } from "effect";

import { TaskValidationError } from "../utils/errors";
import { TaskRepository } from "./task.repository";

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
    const tasks = yield* TaskRepository;
    const uniqueLabelIds = [...new Set(labelIds ?? [])];

    if (assigneeId !== undefined && assigneeId !== null) {
      const assigneeMembership = yield* tasks.findAssigneeMembership(
        organizationId,
        assigneeId
      );

      if (assigneeMembership === undefined) {
        return yield* new TaskValidationError({
          message: "Assignee must be a member of this organization.",
        });
      }
    }

    if (uniqueLabelIds.length > 0) {
      const matchingLabels = yield* tasks.findLabelsByIdsInOrganization(
        organizationId,
        uniqueLabelIds
      );

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
