import { Data } from "effect";

export class ObjectNotFoundError extends Data.TaggedError(
  "ObjectNotFoundError"
)<{
  readonly key: string;
  readonly message?: string;
}> {}

export class ObjectStorageError extends Data.TaggedError("ObjectStorageError")<{
  readonly cause: unknown;
  readonly message: string;
  readonly operation: string;
}> {}

export type ObjectStorageFailure = ObjectNotFoundError | ObjectStorageError;
