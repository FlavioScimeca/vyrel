import { Data } from "effect";

export class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  readonly id: string;
  readonly message?: string;
}> {}

export class TaskRepositoryError extends Data.TaggedError(
  "TaskRepositoryError"
)<{
  readonly cause: unknown;
  readonly message: string;
}> {}

export class TaskValidationError extends Data.TaggedError(
  "TaskValidationError"
)<{
  readonly cause?: unknown;
  readonly issues?: unknown;
  readonly message: string;
}> {}

export class TaskForbiddenError extends Data.TaggedError("TaskForbiddenError")<{
  readonly message: string;
}> {}

export class TaskMediaError extends Data.TaggedError("TaskMediaError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export type TaskError =
  | TaskNotFoundError
  | TaskRepositoryError
  | TaskValidationError
  | TaskForbiddenError
  | TaskMediaError;
