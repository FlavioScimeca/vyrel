import { Layer, ManagedRuntime } from "effect";

import { Database } from "../../../effect/infrastructure/database.service";
import { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import { UserRepository } from "./user.repository";

export const UserServicesLive = Layer.mergeAll(
  UserRepository.Default,
  Database.Default,
  ObjectStorage.Default
);

export type UserServices = UserRepository | Database | ObjectStorage;

export const UserRuntime = ManagedRuntime.make(UserServicesLive);
