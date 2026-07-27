import { Effect } from "effect";

import { type TaskTypeUpdate, taskUpdateSchema } from "../types/base.types";
import { assertTaskAccess } from "../utils/auth-api";
import { TaskRepositoryError, TaskValidationError } from "../utils/errors";
import { uploadTaskImage } from "./image.service";
import { TaskRepository } from "./task.repository";
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

    const tasks = yield* TaskRepository;
    yield* tasks.updateWithLabels({
      labelIds: labelIds === undefined ? undefined : taskRelations.labelIds,
      taskId,
      updates,
    });

    const record = yield* tasks.findById(taskId);

    if (record === undefined) {
      return yield* new TaskRepositoryError({
        cause: null,
        message: "Task was not updated.",
      });
    }

    return record;
  });
