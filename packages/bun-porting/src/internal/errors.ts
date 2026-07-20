import { Data } from "effect";

export class BunPortingError extends Data.TaggedError("BunPortingError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly code?: string;
}> {}
