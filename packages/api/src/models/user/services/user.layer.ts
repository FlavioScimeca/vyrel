import { Layer, ManagedRuntime } from "effect";

const UserServicesLive = Layer.empty;

export const UserRuntime = ManagedRuntime.make(UserServicesLive);

export type UserServices = never;
