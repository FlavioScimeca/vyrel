# @vyrel/morph

Bridge Zod row schemas to Pothos GraphQL fields, args, and inputs.

Use it to derive GraphQL object fields, list filters, and input shapes from Zod models without hand-mapping every column.

## Install

```bash
bun install @vyrel/morph
```

Peer dependencies:

```bash
bun install @pothos/core @pothos/plugin-validation @pothos/plugin-with-input zod
```

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

const userRowSchema = z.object({
  id: z.string(),
  active: z.boolean(),
  role: z.enum(["admin", "member"]),
});

const userGraphql = bridge.model({
  objectName: "User",
  rowSchema: userRowSchema,
  listArgsSchema: {
    filters: z.object({
      role: z.enum(["admin", "member"]),
    }),
  },
});

const User = builder.objectRef<z.infer<typeof userRowSchema>>("User");

builder.objectType(User, {
  fields: (t) => userGraphql.exposeFields(t),
});
```

## API

### `initializeDrizzleGraphqlBridge(builder, options?)`

Creates a bridge bound to your Pothos builder.

Options:

- `defaultIdFields` — columns exposed as GraphQL `ID` (default: none; bridge defaults to `["id", "orgId"]` when omitted in model config)
- `defaultEnumName` — naming strategy for generated enums
- `scalarTypes` — extra scalar names registered on the builder
- `unmappedFields` — `"throw"`, `"warn"`, or `"omit"` when a Zod field cannot map to GraphQL

Returns:

- `bridge.model(config)` — model helpers for a Zod row schema
- `bridge.fields(config)` — alias of `model`
- `bridge.inputsFrom(schema, options?)` — shared input mapper

### `bridge.model(config)`

- `rowSchema` — Zod object schema for the row
- `objectName` — GraphQL type name used for enum registration
- `exclude` — row keys omitted from GraphQL exposure
- `idFields` — override ID columns for this model
- `listArgsSchema` — named Zod schemas converted to query/list args
- `extraEnums` / `extraEnumsFrom` — register additional enum sources
- `computedEnumFields` — resolver-backed enum fields

Model helpers:

- `exposeFields(t, options?)` — map row columns to Pothos object fields
- `inputsFrom(schema, options?)` — map a Zod schema to input fields
- `argsFrom(schema, options?)` — map a Zod schema to field args
- `args` — pre-built args when `listArgsSchema` is configured

## Mapping behavior

- `z.string()` → `String`, or `ID` when the key is listed in `idFields`
- `z.boolean()` → `Boolean`
- `z.enum()` / `z.literal()` → generated GraphQL enums
- nullable and optional Zod fields → nullable GraphQL fields
- Zod `.describe()` → GraphQL field descriptions

Unmapped Zod types follow `unmappedFields` (`throw` by default).

## License

MIT
