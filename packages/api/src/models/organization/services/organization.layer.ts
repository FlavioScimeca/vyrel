import { Layer, ManagedRuntime } from "effect";

const OrganizationServicesLive = Layer.empty;

export const OrganizationRuntime = ManagedRuntime.make(
  OrganizationServicesLive
);

export type OrganizationServices = never;
