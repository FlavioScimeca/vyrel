import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { afterCreateAttachMedia } from "./after-create-attach-media";

class AttachError {
  readonly _tag = "AttachError";
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}

describe("afterCreateAttachMedia", () => {
  it.effect(
    "returns the attach success result when media attach succeeds",
    () =>
      Effect.gen(function* () {
        const created = { id: "1", setCookies: ["a=b"] };
        const withMedia = { id: "1", setCookies: ["a=b"], image: "thumb" };

        const result = yield* afterCreateAttachMedia(
          created,
          Effect.succeed(withMedia)
        );

        expect(result).toEqual(withMedia);
        expect(result.mediaWarning).toBeUndefined();
      })
  );

  it.effect("returns create result with mediaWarning when attach fails", () =>
    Effect.gen(function* () {
      const created = { id: "1", setCookies: ["session=tok"] };

      const result = yield* afterCreateAttachMedia(
        created,
        Effect.fail(new AttachError("Unable to store avatar."))
      );

      expect(result.setCookies).toEqual(["session=tok"]);
      expect(result.id).toBe("1");
      expect(result.mediaWarning).toBe("Unable to store avatar.");
    })
  );
});
