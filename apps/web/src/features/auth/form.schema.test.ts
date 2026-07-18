import { describe, expect, it } from "vitest";
import { signInFormSchema, signUpFormSchema } from "./form.schema";

const validCredentials = {
  email: "person@example.com",
  password: "password123",
};

describe("signInFormSchema", () => {
  it("accepts sign in credentials without sign up fields", () => {
    const result = signInFormSchema.safeParse(validCredentials);

    expect(result.success).toBe(true);
  });

  it("ignores extra sign up-only fields", () => {
    const result = signInFormSchema.safeParse({
      ...validCredentials,
      confirmPassword: "different123",
      name: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty email", () => {
    const result = signInFormSchema.safeParse({
      email: "",
      password: "password123",
    });

    expect(result.success).toBe(false);
  });
});

describe("signUpFormSchema", () => {
  it("requires sign up fields", () => {
    const result = signUpFormSchema.safeParse(validCredentials);

    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    const result = signUpFormSchema.safeParse({
      ...validCredentials,
      confirmPassword: "password123",
      name: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        message: "Name is required",
        path: ["name"],
      })
    );
  });

  it("rejects mismatched sign up passwords", () => {
    const result = signUpFormSchema.safeParse({
      ...validCredentials,
      confirmPassword: "different123",
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

  it("accepts a complete sign up payload", () => {
    const result = signUpFormSchema.safeParse({
      ...validCredentials,
      confirmPassword: "password123",
      name: "Test Person",
    });

    expect(result.success).toBe(true);
  });
});
