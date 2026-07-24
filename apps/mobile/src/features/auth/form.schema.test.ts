import { describe, expect, it } from "@jest/globals";

import {
  resetPasswordSchema,
  signInFormSchema,
  signUpFormSchema,
} from "./form.schema";

describe("authentication validation", () => {
  it("accepts a valid sign-in", () => {
    expect(
      signInFormSchema.safeParse({
        email: "person@example.com",
        password: "correct-horse",
      }).success
    ).toBe(true);
  });

  it("keeps password requirements visible through specific errors", () => {
    const result = signUpFormSchema.safeParse({
      confirmPassword: "short",
      email: "not-an-email",
      name: "",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["confirmPassword", "email", "name", "password"])
      );
    }
  });

  it("rejects mismatched new passwords", () => {
    const result = resetPasswordSchema.safeParse({
      confirmPassword: "different-password",
      password: "correct-horse",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });
});
