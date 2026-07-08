import { Data } from "effect";

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly id: string;
  readonly message?: string;
}> {}

export class UserRepositoryError extends Data.TaggedError(
  "UserRepositoryError"
)<{
  readonly cause: unknown;
  readonly message: string;
}> {}

export class UserValidationError extends Data.TaggedError(
  "UserValidationError"
)<{
  readonly cause?: unknown;
  readonly issues?: unknown;
  readonly message: string;
}> {}

export class UserForbiddenError extends Data.TaggedError("UserForbiddenError")<{
  readonly message: string;
}> {}

export class UserMediaError extends Data.TaggedError("UserMediaError")<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export type UserError =
  | UserNotFoundError
  | UserRepositoryError
  | UserValidationError
  | UserForbiddenError
  | UserMediaError;
