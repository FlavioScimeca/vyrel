import { describe, expect, it } from "vitest";
import { authFormSchema } from "./form.schema";

const validCredentials = {
  email: "person@example.com",
  password: "password123",
};

describe("authFormSchema", () => {
  it("accepts sign in credentials without sign up fields", () => {
    const result = authFormSchema.safeParse({
      ...validCredentials,
      mode: "signin",
    });

    expect(result.success).toBe(true);
  });

  it("requires sign up fields", () => {
    const result = authFormSchema.safeParse({
      ...validCredentials,
      mode: "signup",
    });

    expect(result.success).toBe(false);
  });

  it("rejects mismatched sign up passwords", () => {
    const result = authFormSchema.safeParse({
      ...validCredentials,
      confirmPassword: "different123",
      mode: "signup",
      name: "Test Person",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        message: "Passwords do not match",
        path: ["confirmPassword"],
      })
    );
  });

  it("ignores sign up-only validation when signing in", () => {
    const result = authFormSchema.safeParse({
      ...validCredentials,
      confirmPassword: "different123",
      mode: "signin",
      name: "",
    });

    expect(result.success).toBe(true);
  });

  it.each([
    {},
    { mode: "reset" },
  ])("rejects a missing or invalid mode", (modeValue) => {
    const result = authFormSchema.safeParse({
      ...validCredentials,
      ...modeValue,
    });

    expect(result.success).toBe(false);
  });
});
