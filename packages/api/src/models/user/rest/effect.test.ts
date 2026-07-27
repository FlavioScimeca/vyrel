// @effect-diagnostics asyncFunction:off
import { beforeAll, describe, expect, it, vi } from "vitest";

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

vi.mock("@vyrel/db", () => ({
  db: {},
}));

vi.mock("@vyrel/storage/object-storage", () => ({
  deleteObjects: vi.fn(),
  getSignedDownloadUrl: (key: string) => key,
  uploadObject: vi.fn(),
}));

import { DateTime } from "effect";

type FinishSet = {
  headers: Record<string, string | string[] | undefined>;
  status?: number | string;
};

const fixedDate = DateTime.toDateUtc(
  DateTime.unsafeMake("2026-01-01T00:00:00.000Z")
);

describe("finishUserCreate", () => {
  let finishUserCreate: typeof import("./effect").finishUserCreate;

  beforeAll(async () => {
    ({ finishUserCreate } = await import("./effect"));
  });

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
