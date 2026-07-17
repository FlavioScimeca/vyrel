import { Effect } from "effect";

/** Reads a Fetch `Response` body as untyped JSON (`unknown`). */
export const readResponseJson = <E>(
  response: Response,
  onFailure: (cause: unknown) => E
): Effect.Effect<unknown, E> =>
  Effect.tryPromise({
    catch: onFailure,
    try: (): Promise<unknown> => response.json(),
  });
