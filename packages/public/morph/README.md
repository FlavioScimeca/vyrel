# @vyrel/morph

Type-safe bridge from **Zod** schemas to **Pothos** GraphQL object fields, args,
and inputs.

Use one Zod row/model schema as the source of truth, then expose GraphQL fields,
list filters, and mutation inputs without hand-mapping every column.

```bash
bun add @vyrel/morph
bun add @pothos/core @pothos/plugin-validation @pothos/plugin-with-input zod
```

`@vyrel/logging` is an optional peer. When present, unmapped-field warnings use
structured logs; otherwise the package falls back to `console.warn`.

## Why

In a Drizzle + Zod + Pothos stack you often redefine the same shape three times:

1. database / Zod row schema
2. GraphQL object fields
3. mutation inputs and query args

`@vyrel/morph` derives the GraphQL surface from Zod:

- object field exposure (`exposeFields`)
- `withInput` mutation fields (`inputsFrom`)
- query/list args (`argsFrom` / `listArgsSchema`)
- enum registration from `z.enum` / `z.literal`

You keep control of resolvers, relations, and custom scalars.

## Quick start

```ts
import SchemaBuilder from "@pothos/core";
import ValidationPlugin from "@pothos/plugin-validation";
import WithInputPlugin from "@pothos/plugin-with-input";
import { initializeDrizzleGraphqlBridge } from "@vyrel/morph";
import { z } from "zod/v4";

const builder = new SchemaBuilder({
  plugins: [ValidationPlugin, WithInputPlugin],
});

const bridge = initializeDrizzleGraphqlBridge(builder, {
  defaultIdFields: ["id", "orgId"],
  unmappedFields: "throw",
});

const taskRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  status: z.enum(["todo", "done"]),
});

const taskGraphql = bridge.model({
  objectName: "Task",
  rowSchema: taskRowSchema,
  listArgsSchema: {
    filters: z.object({
      status: z.enum(["todo", "done"]).optional(),
    }),
  },
});

const Task = builder.objectRef<z.infer<typeof taskRowSchema>>("Task");

builder.objectType(Task, {
  fields: (t) => ({
    ...taskGraphql.exposeFields(t),
  }),
});

builder.mutationFields((t) => ({
  createTask: t.fieldWithInput({
    input: {
      ...taskGraphql.inputsFrom(
        taskRowSchema.omit({ id: true })
      ),
    },
    resolve: () => {
      throw new Error("Implement me");
    },
    type: Task,
  }),
}));
```

## API

### `initializeDrizzleGraphqlBridge(builder, options?)`

Creates a bridge bound to your Pothos builder.

| Option | Description |
| --- | --- |
| `defaultIdFields` | Column names exposed as GraphQL `ID`. When omitted on both bridge and model, defaults to `["id", "orgId"]`. |
| `defaultEnumName` | Naming strategy for generated enums `(field, objectName) => string`. |
| `scalarTypes` | Extra scalar names registered on the builder. |
| `unmappedFields` | `"throw"` (default), `"warn"`, or `"omit"` when a Zod field cannot map to GraphQL. |

Returns:

| Method | Description |
| --- | --- |
| `bridge.model(config)` | Model helpers for a Zod row schema |
| `bridge.fields(config)` | Alias of `model` |
| `bridge.inputsFrom(schema, options?)` | Shared input mapper (no model binding) |

### `bridge.model(config)`

| Option | Description |
| --- | --- |
| `rowSchema` | Zod object schema for the row |
| `objectName` | GraphQL type name used for enum registration |
| `exclude` | Row keys omitted from GraphQL exposure |
| `idFields` | Override ID columns for this model |
| `listArgsSchema` | Named Zod schemas converted to query/list args |
| `extraEnums` / `extraEnumsFrom` | Register additional enum sources |
| `computedEnumFields` | Resolver-backed enum fields |
| `unmappedFields` | Per-model override of the bridge policy |

Model helpers:

| Helper | Description |
| --- | --- |
| `exposeFields(t, options?)` | Map row columns to Pothos object fields |
| `inputsFrom(schema, options?)` | Map a Zod schema to `withInput` fields |
| `argsFrom(schema, options?)` | Map a Zod schema to field args |
| `args` | Pre-built args when `listArgsSchema` is configured |

Common `inputsFrom` / `argsFrom` options:

- `exclude` — omit keys
- `fieldTypes` — per-field GraphQL type overrides (scalars, ambiguous enums, lists)
- `required` — force required/optional GraphQL input fields
- `unmappedFields` — local policy override

## Mapping behavior

| Zod | GraphQL |
| --- | --- |
| `z.string()` | `String`, or `ID` when the key is in `idFields` |
| `z.boolean()` | `Boolean` |
| `z.number()` | `Float` / `Int` (inferred) |
| `z.date()` | `DateTime` when registered |
| `z.enum()` / `z.literal()` | Generated GraphQL enums |
| nullable / optional Zod | Nullable GraphQL fields |
| `.describe()` | GraphQL field description |

Unmapped Zod types follow `unmappedFields` (`throw` by default).

## What this package does not do

- It does not replace Pothos, Zod, or Drizzle.
- It does not generate resolvers or authorization.
- It does not invent relation fields — add those manually next to `exposeFields`.
- It does not run GraphQL Codegen (that belongs on the client with
  `@vyrel/graphql-client`).

## License

MIT
