import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { BunImage, isNativeImageAvailable } from "./bun-image";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../test-fixtures/sample.png"
);

describe("BunImage", () => {
  it("reports native availability on this host", () => {
    expect(typeof isNativeImageAvailable()).toBe("boolean");
  });

  it("reads metadata from the sample PNG when Bun.Image is available", async () => {
    if (!isNativeImageAvailable()) {
      return;
    }

    const bytes = await Bun.file(fixturePath).bytes();
    const metadata = await new BunImage(bytes).metadata();

    expect(metadata.width).toBe(1);
    expect(metadata.height).toBe(1);
  });

  it("resizes and encodes webp when Bun.Image is available", async () => {
    if (!isNativeImageAvailable()) {
      return;
    }

    const bytes = await Bun.file(fixturePath).bytes();
    const output = await new BunImage(bytes)
      .resize(8, 8, { fit: "inside" })
      .webp({ quality: 80 })
      .bytes();

    expect(output.byteLength).toBeGreaterThan(0);
  });
});
