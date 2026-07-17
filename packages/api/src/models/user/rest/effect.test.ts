import { DateTime } from "effect";
import { describe, expect, it } from "vitest";

import { finishUserCreate } from "./effect";

type FinishSet = {
  headers: Record<string, string | string[] | undefined>;
  status?: number | string;
};

const fixedDate = DateTime.toDateUtc(
  DateTime.unsafeMake("2026-01-01T00:00:00.000Z")
);

describe("finishUserCreate", () => {
  it("applies set-cookie and omits mediaWarning when absent", () => {
    const set: FinishSet = {
      headers: {},
    };

    const body = finishUserCreate(set, {
      setCookies: ["better-auth.session_token=abc"],
      token: "tok",
      user: {
        createdAt: fixedDate,
        email: "a@b.com",
        emailVerified: false,
        id: "user-1",
        imageAssetId: null,
        imageFull: null,
        imagePlaceholder: null,
        imageThumb: null,
        name: "Ada",
        updatedAt: fixedDate,
      },
    });

    expect(set.status).toBe(201);
    expect(set.headers["set-cookie"]).toBe("better-auth.session_token=abc");
    expect(body).toEqual({
      token: "tok",
      user: expect.objectContaining({ id: "user-1" }),
    });
    expect("mediaWarning" in body).toBe(false);
  });

  it("includes mediaWarning on the success body when present", () => {
    const set: FinishSet = {
      headers: {},
    };

    const body = finishUserCreate(set, {
      mediaWarning: "Unable to save avatar.",
      setCookies: ["better-auth.session_token=abc"],
      token: null,
      user: {
        createdAt: fixedDate,
        email: "a@b.com",
        emailVerified: false,
        id: "user-1",
        imageAssetId: null,
        imageFull: null,
        imagePlaceholder: null,
        imageThumb: null,
        name: "Ada",
        updatedAt: fixedDate,
      },
    });

    expect(set.status).toBe(201);
    expect(set.headers["set-cookie"]).toBe("better-auth.session_token=abc");
    expect(body.mediaWarning).toBe("Unable to save avatar.");
  });
});
