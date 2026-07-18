import { Effect, Either } from "effect";

export type WithMediaWarning<A> = A & {
  mediaWarning?: string;
};

type ErrorWithMessage = {
  readonly message: string;
};

/**
 * Runs post-create media attach as best-effort. If attach fails, returns the
 * original create result plus `mediaWarning` so session cookies are still applied.
 */
export const afterCreateAttachMedia = <A, E extends ErrorWithMessage>(
  createResult: A,
  attach: Effect.Effect<A, E>
): Effect.Effect<WithMediaWarning<A>> =>
  Effect.map(Effect.either(attach), (outcome): WithMediaWarning<A> => {
    if (Either.isLeft(outcome)) {
      return {
        ...createResult,
        mediaWarning: outcome.left.message,
      };
    }

    return outcome.right as WithMediaWarning<A>;
  });
