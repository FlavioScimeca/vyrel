import { Data } from "effect";

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string;
}> {
  constructor(message = "You do not have access to this resource") {
    super({ message });
  }
}

export class UnauthenticatedError extends Data.TaggedError(
  "UnauthenticatedError"
)<{
  readonly message: string;
}> {
  constructor(message = "You must be logged in") {
    super({ message });
  }
}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string;
}> {
  constructor(message = "Resource not found") {
    super({ message });
  }
}

export class ServiceUnavailableError extends Data.TaggedError(
  "ServiceUnavailableError"
)<{
  readonly message: string;
}> {
  constructor(message = "Service is not available") {
    super({ message });
  }
}

export type AppError =
  | ForbiddenError
  | UnauthenticatedError
  | NotFoundError
  | ServiceUnavailableError;
