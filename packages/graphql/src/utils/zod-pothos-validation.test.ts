import { Data, Effect, Exit, Layer, ManagedRuntime } from "effect";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { createGraphqlRunner } from "../effect/create-graphql-runner";
import { parseArgsEffect, withZodValidation } from "./zod-pothos-validation";

class DemoNotFoundError extends Data.TaggedError("DemoNotFoundError")<{
  readonly id: string;
  readonly message?: string;
}> {}

describe("withZodValidation", () => {
  it("merges validate onto plain field configs", () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().int(),
    });

    const fields = withZodValidation(
      {
        name: { required: true },
        age: { required: false },
      },
      schema
    );

    expect(fields.name).toMatchObject({
      required: true,
      validate: schema.shape.name,
    });
    expect(fields.age).toMatchObject({
      required: false,
      validate: schema.shape.age,
    });
  });

  it("leaves non-plain field values unchanged", () => {
    class FieldRef {
      kind = "InputObject";
    }
    const ref = new FieldRef();
    const schema = z.object({ title: z.string() });

    const fields = withZodValidation({ title: ref }, schema);
    expect(fields.title).toBe(ref);
  });
});

describe("parseArgsEffect", () => {
  it("succeeds with parsed values", async () => {
    const schema = z.object({ id: z.string().min(1) });
    const result = await Effect.runPromise(
      parseArgsEffect(schema, { id: "abc" })
    );
    expect(result).toEqual({ id: "abc" });
  });

  it("fails with ZodError on invalid input", async () => {
    const schema = z.object({ id: z.string().min(1) });
    const exit = await Effect.runPromiseExit(
      parseArgsEffect(schema, { id: "" })
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("createGraphqlRunner", () => {
  it("maps tagged domain errors to GraphQL errors", async () => {
    const runtime = ManagedRuntime.make(Layer.empty);
    const log = {
      error: vi.fn(),
      warn: vi.fn(),
    };
    const run = createGraphqlRunner({
      domain: "demo",
      errorMap: {
        DemoNotFoundError: {
          code: "NOT_FOUND",
          message: (error) =>
            error.message ?? `Demo ${error.id} was not found.`,
          status: 404,
        },
      },
      log,
      runtime,
    });

    await expect(
      run(
        Effect.fail(
          new DemoNotFoundError({ id: "1", message: "Demo 1 was not found." })
        ),
        {
          kind: "query",
          operation: "demo",
        }
      )
    ).rejects.toMatchObject({
      extensions: { code: "NOT_FOUND" },
      message: "Demo 1 was not found.",
    });

    expect(log.error).not.toHaveBeenCalled();
  });

  it("logs mutation failures", async () => {
    const runtime = ManagedRuntime.make(Layer.empty);
    const log = {
      error: vi.fn(),
      warn: vi.fn(),
    };
    const run = createGraphqlRunner({
      domain: "demo",
      errorMap: {
        DemoNotFoundError: {
          code: "NOT_FOUND",
          status: 404,
        },
      },
      log,
      runtime,
    });

    await expect(
      run(Effect.fail(new DemoNotFoundError({ id: "1" })), {
        kind: "mutation",
        operation: "createDemo",
      })
    ).rejects.toBeTruthy();

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "demo.mutation.failed",
        operation: "createDemo",
      })
    );
  });
});
