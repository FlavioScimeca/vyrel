import { Layer, ManagedRuntime } from "effect";

import { Database } from "../../../effect/infrastructure/database.service";
import { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import { MembershipRepository } from "../../../effect/repositories/membership.repository";
import { TaskRepository } from "./task.repository";

export const TaskServicesLive = Layer.mergeAll(
  TaskRepository.Default,
  MembershipRepository.Default,
  Database.Default,
  ObjectStorage.Default
);

export type TaskServices =
  | TaskRepository
  | MembershipRepository
  | Database
  | ObjectStorage;

export const TaskRuntime = ManagedRuntime.make(TaskServicesLive);
