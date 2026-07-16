import { Layer, ManagedRuntime } from "effect";

const TaskServicesLive = Layer.empty;

export const TaskRuntime = ManagedRuntime.make(TaskServicesLive);

export type TaskServices = never;
