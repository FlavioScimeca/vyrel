import { describe, expect, it } from "@effect/vitest";
import { DateTime, Effect } from "effect";
import { beforeEach, vi } from "vitest";

vi.mock("@vyrel/env/server", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-better-auth-secret-32chars!!",
    BETTER_AUTH_URL: "http://localhost:3000",
    CORS_ORIGIN: "http://localhost:3001",
    DATABASE_AUTH_TOKEN: "test-token",
    DATABASE_URL: "file:test.db",
    LOG_LEVEL: "error",
    MEDIA_MAX_UPLOAD_BYTES: 100 * 1024 * 1024,
    NODE_ENV: "test",
    PROFILE_SQL_LIMIT: 20,
    PROFILING: false,
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_ACCOUNT_ID: "test-account",
    R2_BUCKET_NAME: "test-bucket",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
    R2_SIGNED_URL_TTL_SECONDS: 3600,
    RESEND_API_KEY: "re_test_key",
    RESEND_FROM_EMAIL: "onboarding@resend.dev",
  },
}));

import { UserMediaError } from "../utils/errors";
import type { SignUpEmailResult } from "./auth.service";

const signUpEmail = vi.hoisted(() => vi.fn());
const updateAuthUser = vi.hoisted(() => vi.fn());
const uploadUserAvatar = vi.hoisted(() => vi.fn());

vi.mock("./auth.service", () => ({
  signUpEmail,
  updateAuthUser,
}));

vi.mock("./avatar.service", () => ({
  uploadUserAvatar,
}));

import { createUser } from "./create.service";

const fixedDate = DateTime.toDateUtc(
  DateTime.unsafeMake("2026-01-01T00:00:00.000Z")
);

const signUpResult: SignUpEmailResult = {
  setCookies: ["better-auth.session_token=abc"],
  token: "session-token",
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
};

const imageFields = {
  imageAssetId: "user-1",
  imageFull: "users/user-1/full.webp",
  imagePlaceholder: "blur",
  imageThumb: "users/user-1/thumb.webp",
};

describe("createUser soft-fail media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signUpEmail.mockReturnValue(Effect.succeed(signUpResult));
    updateAuthUser.mockReturnValue(Effect.void);
    uploadUserAvatar.mockReturnValue(Effect.succeed(imageFields));
  });

  it.effect("returns sign-up without mediaWarning when no avatar", () =>
    Effect.gen(function* () {
      const result = yield* createUser(
        {
          email: "a@b.com",
          name: "Ada",
          password: "password1",
        },
        new Headers()
      );

      expect(signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          callbackURL: "http://localhost:3001/auth/verified",
          email: "a@b.com",
        }),
        expect.any(Headers)
      );
      expect(result.setCookies).toEqual(signUpResult.setCookies);
      expect(result.mediaWarning).toBeUndefined();
      expect(uploadUserAvatar).not.toHaveBeenCalled();
    })
  );

  it.effect("merges image fields when avatar upload succeeds", () =>
    Effect.gen(function* () {
      const avatar = new File(["x"], "a.png", { type: "image/png" });

      const result = yield* createUser(
        {
          avatar,
          email: "a@b.com",
          name: "Ada",
          password: "password1",
        },
        new Headers()
      );

      expect(result.setCookies).toEqual(signUpResult.setCookies);
      expect(result.mediaWarning).toBeUndefined();
      expect(result.user.imageThumb).toBe(imageFields.imageThumb);
    })
  );

  it.effect(
    "keeps setCookies and sets mediaWarning when avatar upload fails",
    () =>
      Effect.gen(function* () {
        const avatar = new File(["x"], "a.png", { type: "image/png" });
        uploadUserAvatar.mockReturnValue(
          Effect.fail(
            new UserMediaError({
              message: "Unable to store avatar in object storage.",
            })
          )
        );

        const result = yield* createUser(
          {
            avatar,
            email: "a@b.com",
            name: "Ada",
            password: "password1",
          },
          new Headers()
        );

        expect(result.setCookies).toEqual(["better-auth.session_token=abc"]);
        expect(result.mediaWarning).toBe(
          "Unable to store avatar in object storage."
        );
        expect(result.user.imageThumb).toBeNull();
        expect(updateAuthUser).not.toHaveBeenCalled();
      })
  );
});
