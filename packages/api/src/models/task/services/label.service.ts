import { Effect } from "effect";

import { MembershipRepository } from "../../../effect/repositories/membership.repository";
import type {
  TaskLabelTypeCreate,
  TaskLabelTypeDelete,
  TaskLabelTypeUpdate,
} from "../types/base.types";
import { assertOrgMembership } from "../utils/auth-api";
import {
  TaskForbiddenError,
  TaskNotFoundError,
  TaskRepositoryError,
} from "../utils/errors";
import { TaskRepository } from "./task.repository";

const assertLabelManager = (organizationId: string, actorUserId: string) =>
  Effect.gen(function* () {
    const memberships = yield* MembershipRepository;
    const role = yield* memberships
      .findMembershipRole(organizationId, actorUserId)
      .pipe(
        Effect.mapError(
          (cause) =>
            new TaskRepositoryError({
              cause,
              message: "Unable to verify label permissions.",
            })
        )
      );

    const roles = role?.split(",") ?? [];
    if (!roles.some((value) => value === "owner" || value === "admin")) {
      return yield* new TaskForbiddenError({
        message: "Only organization owners and admins can manage labels.",
      });
    }
  });

export const listLabelsForTask = (taskId: string) =>
  Effect.gen(function* () {
    const tasks = yield* TaskRepository;
    return yield* tasks.findLabelsForTask(taskId);
  });

export const listTaskLabels = (organizationId: string, actorUserId: string) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(organizationId, actorUserId);
    const tasks = yield* TaskRepository;
    return yield* tasks.findLabelsInOrganization(organizationId);
  });

export const createTaskLabel = (
  input: TaskLabelTypeCreate,
  actorUserId: string
) =>
  Effect.gen(function* () {
    yield* assertOrgMembership(input.organizationId, actorUserId);
    const labelId = yield* Effect.sync(() => Bun.randomUUIDv7());
    const tasks = yield* TaskRepository;
    return yield* tasks.createLabel({
      color: input.color.toUpperCase(),
      id: labelId,
      name: input.name,
      organizationId: input.organizationId,
    });
  });

export const updateTaskLabel = (
  input: TaskLabelTypeUpdate,
  actorUserId: string
) =>
  Effect.gen(function* () {
    const tasks = yield* TaskRepository;
    const existing = yield* tasks.findLabelById(input.labelId);
    if (existing === undefined) {
      return yield* new TaskNotFoundError({ id: input.labelId });
    }
    yield* assertLabelManager(existing.organizationId, actorUserId);

    yield* tasks.updateLabel(input.labelId, {
      color: input.color?.toUpperCase(),
      name: input.name,
    });

    const updated = yield* tasks.findLabelById(input.labelId);
    if (updated === undefined) {
      return yield* new TaskNotFoundError({ id: input.labelId });
    }
    return updated;
  });

export const deleteTaskLabel = (
  input: TaskLabelTypeDelete,
  actorUserId: string
) =>
  Effect.gen(function* () {
    const tasks = yield* TaskRepository;
    const existing = yield* tasks.findLabelById(input.labelId);
    if (existing === undefined) {
      return yield* new TaskNotFoundError({ id: input.labelId });
    }
    yield* assertLabelManager(existing.organizationId, actorUserId);
    yield* tasks.deleteLabelById(input.labelId);
    return input.labelId;
  });
