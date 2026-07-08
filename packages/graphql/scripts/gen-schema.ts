import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import dotenv from "dotenv";
import { Effect } from "effect";
import { lexicographicSortSchema, printSchema } from "graphql";
import { collectGraphqlImports } from "./collect-graphql-imports";

dotenv.config({
  path: "../../apps/server/.env",
});

const program = Effect.gen(function* () {
  yield* collectGraphqlImports;

  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const { schema } = yield* Effect.promise(() => import("../src/schema"));
  const sdl = printSchema(lexicographicSortSchema(schema));

  const outputFile = path.resolve(
    import.meta.dirname,
    "../../../apps/web/schema.graphql"
  );
  yield* fs.writeFileString(outputFile, sdl);

  yield* Effect.log("✅ 🔨 GraphQL schema generated successfully");
});

// @effect-diagnostics-next-line effect/strictEffectProvide:off
BunRuntime.runMain(program.pipe(Effect.provide(BunContext.layer)));
