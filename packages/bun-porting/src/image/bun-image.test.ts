import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { BunPortingError } from "../internal/errors";
import { BunImage, isNativeImageAvailable } from "./bun-image";
import { PipelineBuilder } from "./pipeline-builder";

const samplePngPath = new URL("../../test-fixtures/sample.png", import.meta.url)
  .pathname;

describe("BunImage", () => {
  it("reports native availability on this host", () => {
    expect(typeof isNativeImageAvailable()).toBe("boolean");
  });

  it("PipelineBuilder accumulates operations without executing", () => {
    const ops = new PipelineBuilder()
      .resize(8, 8, { fit: "inside" })
      .webp({ quality: 80 })
      .toOperations();

    expect(ops).toEqual([
      {
        height: 8,
        op: "resize",
        options: { fit: "inside" },
        width: 8,
      },
      { op: "webp", options: { quality: 80 } },
    ]);
  });

  it.effect(
    "reads metadata from the sample PNG when Bun.Image is available",
    () =>
      Effect.gen(function* () {
        if (!isNativeImageAvailable()) {
          return;
        }

        const bytes = yield* Effect.tryPromise({
          catch: (cause) =>
            new BunPortingError({
              cause,
              message: "Failed to read fixture.",
            }),
          try: () => Bun.file(samplePngPath).bytes(),
        });
        const metadata = yield* Effect.promise(() =>
          new BunImage(bytes).metadata()
        );

        expect(metadata.width).toBe(1);
        expect(metadata.height).toBe(1);
      })
  );

  it.effect("resizes and encodes webp when Bun.Image is available", () =>
    Effect.gen(function* () {
      if (!isNativeImageAvailable()) {
        return;
      }

      const bytes = yield* Effect.tryPromise({
        catch: (cause) =>
          new BunPortingError({
            cause,
            message: "Failed to read fixture.",
          }),
        try: () => Bun.file(samplePngPath).bytes(),
      });
      const output = yield* Effect.promise(() =>
        new BunImage(bytes)
          .resize(8, 8, { fit: "inside" })
          .webp({ quality: 80 })
          .bytes()
      );

      expect(output.byteLength).toBeGreaterThan(0);
    })
  );

  it.effect(
    "batch runs multiple pipelines (bytes + dataurl) when Bun.Image is available",
    () =>
      Effect.gen(function* () {
        if (!isNativeImageAvailable()) {
          return;
        }

        const bytes = yield* Effect.tryPromise({
          catch: (cause) =>
            new BunPortingError({
              cause,
              message: "Failed to read fixture.",
            }),
          try: () => Bun.file(samplePngPath).bytes(),
        });

        const result = yield* Effect.promise(() =>
          BunImage.batch(bytes, {
            pipelines: {
              placeholder: (img) =>
                img.resize(8, 8, { fit: "inside" }).webp({ quality: 10 }),
              thumb: (img) =>
                img.resize(8, 8, { fit: "inside" }).webp({ quality: 80 }),
            },
            terminals: { placeholder: "dataurl" },
          })
        );

        expect(result.thumb.byteLength).toBeGreaterThan(0);
        expect(result.placeholder.startsWith("data:image/")).toBe(true);
      })
  );
});
