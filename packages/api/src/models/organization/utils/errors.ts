import { Data } from "effect";

export class OrganizationNotFoundError extends Data.TaggedError(
  "OrganizationNotFoundError"
)<{
  readonly id: string;
  readonly message?: string;
}> {}

export class OrganizationRepositoryError extends Data.TaggedError(
  "OrganizationRepositoryError"
)<{
  readonly cause: unknown;
  readonly message: string;
}> {}

export class OrganizationValidationError extends Data.TaggedError(
  "OrganizationValidationError"
)<{
  readonly cause?: unknown;
  readonly issues?: unknown;
  readonly message: string;
}> {}

export class OrganizationForbiddenError extends Data.TaggedError(
  "OrganizationForbiddenError"
)<{
  readonly message: string;
}> {}

export class OrganizationMediaError extends Data.TaggedError(
  "OrganizationMediaError"
)<{
  readonly cause?: unknown;
  readonly message: string;
}> {}

export type OrganizationError =
  | OrganizationNotFoundError
  | OrganizationRepositoryError
  | OrganizationValidationError
  | OrganizationForbiddenError
  | OrganizationMediaError;
