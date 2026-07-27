import { Layer, ManagedRuntime } from "effect";

import { Database } from "../../../effect/infrastructure/database.service";
import { ObjectStorage } from "../../../effect/infrastructure/object-storage.service";
import { MembershipRepository } from "../../../effect/repositories/membership.repository";
import { OrganizationRepository } from "./organization.repository";

export const OrganizationServicesLive = Layer.mergeAll(
  OrganizationRepository.Default,
  MembershipRepository.Default,
  Database.Default,
  ObjectStorage.Default
);

export type OrganizationServices =
  | OrganizationRepository
  | MembershipRepository
  | Database
  | ObjectStorage;

export const OrganizationRuntime = ManagedRuntime.make(
  OrganizationServicesLive
);
