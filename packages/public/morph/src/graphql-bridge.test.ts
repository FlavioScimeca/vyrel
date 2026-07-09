import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import SchemaBuilder from "@pothos/core";
import ValidationPlugin from "@pothos/plugin-validation";
import WithInputPlugin from "@pothos/plugin-with-input";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { initializeDrizzleGraphqlBridge } from ".";

const sourceRoot = dirname(fileURLToPath(import.meta.url));

const readSourceFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return readSourceFiles(path);
      }

      if (entry.isFile() && entry.name.endsWith(".ts")) {
        return [path];
      }

      return [];
    })
  );

  return files.flat();
};

describe("initializeDrizzleGraphqlBridge", () => {
  it("keeps the root package API focused on the bridge", async () => {
    const rootExports = await import(".");

    expect(rootExports).toHaveProperty("initializeDrizzleGraphqlBridge");
    expect(rootExports).not.toHaveProperty("createPothosInputsFromZodSchema");
  });

  it("uses the Pothos builder supplied by the consumer", () => {
    const builder = new SchemaBuilder({
      plugins: [ValidationPlugin, WithInputPlugin],
    });
    const bridge = initializeDrizzleGraphqlBridge(builder, {
      defaultIdFields: ["id"],
      unmappedFields: "throw",
    });
    const rowSchema = z.object({
      active: z.boolean(),
      id: z.string(),
      role: z.enum(["admin", "member"]),
    });

    const model = bridge.model({
      listArgsSchema: {
        filters: z.object({
          role: z.enum(["admin", "member"]),
        }),
      },
      objectName: "User",
      rowSchema,
    });

    expect(builder.configStore.typeConfigs.has("UserRole")).toBe(true);
    expect(Object.keys(model.inputsFrom(rowSchema))).toEqual([
      "active",
      "id",
      "role",
    ]);
    expect(Object.keys(model.args.filters)).toEqual(["role"]);
  });

  it("does not import internal Vyrel builders from the public package source", async () => {
    const sourceFiles = await readSourceFiles(sourceRoot);
    const checkedImports = await Promise.all(
      sourceFiles
        .filter((file) => !file.endsWith(".test.ts"))
        .map(async (file) => {
          const contents = await readFile(file, "utf8");
          if (
            contents.includes('from "../pothos"') ||
            contents.includes('from "./pothos"') ||
            contents.includes('"@vyrel/graphql') ||
            contents.includes("'@vyrel/graphql")
          ) {
            return relative(sourceRoot, file);
          }
        })
    );
    const violatingImports = checkedImports.filter(
      (file) => file !== undefined
    );

    expect(violatingImports).toEqual([]);
  });
});
