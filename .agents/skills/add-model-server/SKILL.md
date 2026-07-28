---
name: add-model-server
description: >-
  Adds a new server-side domain model end-to-end: Drizzle schema, Effect
  repository/services/layer, Zod base/extra types, @vyrel/morph → Pothos
  GraphQL (and optional REST). Use when the user asks to add a model, table,
  domain entity, GraphQL type/queries/mutations, or API services under
  packages/db and packages/api. Does not run db:push, migrations, or GraphQL
  schema codegen.
---

# Add model (server)

Operational workflow for a **new domain model** on the backend. Follow the
hierarchy and conventions below. Mirror patterns from **existing peers** under
`packages/api/src/models/*` only when you need a concrete reference for a file
role — do not treat any single model as permanent canon.

## Hard rules

1. **Write files only.** Do **not** run:
   - `db:push` / `db:generate` / `db:migrate` (or drizzle-kit equivalents)
   - `graphql:schema` / GraphQL import collection / SDL codegen
2. **No SQL migrations.** Schema changes are Drizzle schema files only. The
   human applies them (`db:push` or migrate) when ready.
3. **No business logic in GraphQL resolvers.** Resolvers: auth → parse args →
   call a service via the domain GraphQL Effect runner.
4. **Shared helpers** live in `packages/api/src/lib/`, not under the model.
5. **Logging** only via `@vyrel/logging` (see project logging rules).
6. After writing code, **tell the user** which commands they should run (never
   execute them as part of this skill).

## When optional pieces apply

| Piece | Add when |
|-------|----------|
| `create|update|delete.service.ts` | That mutation exists |
| `utils/auth-api.ts` | Org membership / actor fetch needed |
| `utils/validate-*.ts` | Media or custom validation |
| Extra `*.service.ts` (media, labels, …) | Domain needs it |
| `rest/` + server plugin | Multipart / Better Auth HTTP create path |
| `MembershipRepository` in layer | Org-scoped access |
| `ObjectStorage` in layer | Uploads / images |

Skip what the feature does not need. Prefer the smallest complete surface.

## Target hierarchy

```
packages/db/src/schemas/<name>.schema.ts
packages/db/src/schema.ts                 # export *
packages/db/src/relations.ts              # wire relations

packages/api/src/models/<name>/
├── services/
│   ├── <name>.repository.ts
│   ├── <name>.layer.ts
│   ├── create.service.ts                 # if needed
│   ├── read.service.ts
│   ├── update.service.ts                 # if needed
│   ├── delete.service.ts                 # if needed
│   └── <feature>.service.ts              # optional
├── types/
│   ├── base.types.ts
│   └── extra.types.ts
├── utils/
│   ├── errors.ts
│   ├── auth-api.ts                       # if needed
│   └── validate-*.ts                     # optional
├── graphql/
│   ├── <name>.graphql.ts                 # discovery barrel (required)
│   ├── effect.ts
│   ├── <name>.query.ts
│   └── mutations/
│       └── <verb>.ts
└── rest/                                 # optional
    ├── create.ts
    └── effect.ts
```

GraphQL discovery: any `packages/api/src/models/**/*.graphql.ts` is collected
when the **user** runs schema gen. Your job is to add `<name>.graphql.ts` that
side-effect-imports query + mutation modules.

## Checklist (ordered)

### 1. Database (`@vyrel/db`)

- [ ] Add `packages/db/src/schemas/<name>.schema.ts`
  - `sqliteTable("<snake>", { camelField: text("snake_col")… })`
  - PK `text("id").primaryKey()` unless existing auth tables dictate otherwise
  - Timestamps: `integer(..., { mode: "timestamp_ms" })` + unixepoch default /
    `.$onUpdate(nowDate)` as peers do
  - FKs via `.references(() => …, { onDelete: … })`
  - Indexes in the table callback; export `as const` enums when needed
- [ ] Re-export from `packages/db/src/schema.ts`
- [ ] Wire `packages/db/src/relations.ts` (`r.one` / `r.many`, keys = table
      export names)
- [ ] **Stop.** Do not push or migrate.

### 2. Errors (`utils/errors.ts`)

- [ ] `Data.TaggedError` kinds used by this domain (typically
      `NotFound` / `Repository` / `Validation` / `Forbidden` / `Media` as needed)
- [ ] Union type `<Name>Error`
- [ ] Naming: `<Name><Kind>Error` (matches `_tag` used in GraphQL `errorMap`)

### 3. Repository + layer

- [ ] `services/<name>.repository.ts`
  - `Effect.Service` id:
    `@vyrel/api/models/<name>/services/<name>.repository/<Name>Repository`
  - `dependencies: [Database.Default]`
  - Drizzle via `yield* Database` → `Effect.tryPromise` → `*RepositoryError`
- [ ] `services/<name>.layer.ts`
  - `Layer.mergeAll(Repository.Default, …infra)`
  - `ManagedRuntime.make(...)`
  - Export `<Name>Services` union and `<Name>Runtime`
- [ ] Reuse shared infra from `packages/api/src/effect/` (`Database`,
      `ObjectStorage`, `MembershipRepository`, …) — do not duplicate

### 4. Zod types (`base` vs `extra`)

Zod is the source of truth for validation **and** for the GraphQL surface
(via Morph). Split schemas by role:

| File | Role | Typical contents |
|------|------|------------------|
| `types/base.types.ts` | **Base** — row / create / update shapes | `createSelectSchema` / `createInsertSchema` from the Drizzle table; `.pick` / `.extend` / `.partial`; `.meta({ pothosType: "ID" \| "File" \| "LocalDate" })` when needed |
| `types/extra.types.ts` | **Extra** — operation args & filters | by-id, list/filter/connection args, delete input keys, aggregates |

Simple idea:

```ts
// base.types.ts — row + write payloads
export const fooQuerySchema = createSelectSchema(foo).omit({ /* secrets */ });
export const fooCreateSchema = createInsertSchema(foo).pick({ title: true });

// extra.types.ts — args that are not the row itself
export const fooByIdSchema = z.object({ id: z.string().min(1) });
```

### 5. Auth helpers (if needed)

- [ ] `utils/auth-api.ts` — membership / fetch / inaccessible patterns consistent
      with peer models that enforce org or actor checks

### 6. Domain services

- [ ] One file per operation (`create|read|update|delete.service.ts`)
- [ ] `Effect.gen`: Zod validate → auth → repository/infra → return row/result
- [ ] Fail with domain TaggedErrors — never throw raw strings

### 7. GraphQL (Pothos + Morph)

This API is GraphQL-first. Objects, queries, and mutations are registered on the
shared Pothos `builder` (`@vyrel/graphql/pothos`). Resolvers stay thin.

**`@vyrel/morph`** bridges Zod → Pothos so you do not hand-map every column:

- `exposeFields(t)` — object fields from a row Zod schema
- `inputsFrom(zodSchema)` — mutation `withInput` fields from a write Zod schema
- `argsFrom` / list helpers — query args from Zod when peers use them

In app code you use the project bridge (Morph already wired):

```ts
import { graphqlBridge } from "@vyrel/graphql/graphql-bridge";
import { builder } from "@vyrel/graphql/pothos";
```

Minimal pattern:

```ts
const fooGraphql = graphqlBridge.model({
  objectName: "Foo",
  rowSchema: fooQuerySchema, // from base.types
});

export const FooObject = builder.drizzleObject("foo", {
  name: "Foo",
  fields: (t) => ({
    ...fooGraphql.exposeFields(t),
    // custom fields only when Zod/Morph cannot express them
  }),
});

builder.queryFields((t) => ({
  foo: t.field({
    args: { id: t.arg.id({ required: true }) },
    type: FooObject,
    resolve: (_root, args, context) =>
      runFooGraphqlEffect(/* requireActor → parseArgs(extra) → service */, {
        kind: "query",
        operation: "foo",
      }),
  }),
}));

builder.mutationFields((t) => ({
  updateFoo: t.fieldWithInput({
    input: { ...fooGraphql.inputsFrom(fooUpdateSchema) }, // base.types
    type: FooObject,
    resolve: (_root, args, context) =>
      runFooGraphqlEffect(/* … */, { kind: "mutation", operation: "updateFoo" }),
  }),
}));
```

Checklist:

- [ ] `graphql/effect.ts` — `createGraphqlRunner` with `domain`, `runtime`,
      `log` from `@vyrel/logging`, `errorMap` keyed by `_tag`
- [ ] `graphql/<name>.query.ts` — `graphqlBridge.model` + `builder.drizzleObject`
      + `builder.queryFields`
- [ ] `graphql/mutations/<verb>.ts` — `builder.mutationFields` /
      `t.fieldWithInput` + `inputsFrom` from Morph
- [ ] Resolver order: `requireActorEffect` (when private) → `parseArgsEffect`
      (Zod) → domain service via `run<Name>GraphqlEffect`
- [ ] `graphql/<name>.graphql.ts` — side-effect imports of query + mutations only
- [ ] Do **not** hand-edit `packages/graphql/gen/generated-imports.ts`; discovery
      runs when the user generates the schema

To see how GraphQL + Morph are written in this repo, look at existing
`graphql/*.query.ts` and `graphql/mutations/*.ts` under
`packages/api/src/models/*`. Do not dig into `@vyrel/morph` package sources.

### 8. REST (optional)

- [ ] `rest/effect.ts` via `createHttpRunner`
- [ ] `rest/create.ts` (or other verbs) as Elysia plugin
- [ ] Register under `apps/server/src/plugins/` and `.use(...)` in
      `apps/server/src/app.ts`

### 9. Finish

Remind the user (do not run):

```text
# apply schema (human choice)
bun db:push
# or: bun db:generate && bun db:migrate

# regenerate GraphQL imports + SDL for clients
bun graphql:schema
```

## How to use existing models as reference

When unsure about a **file role**, open **multiple** peers under
`packages/api/src/models/` and match the same role (repository, `base.types` /
`extra.types`, `graphql/*.query.ts`, mutations with `inputsFrom`, etc.). Prefer
structural consistency over copying an entire domain. Auth-only tables may live
in `packages/db` without a full `models/<name>/` tree — only add the API tree
when the domain is exposed.

## Anti-patterns

- Generating or applying migrations / running `db:push` / running schema codegen
- Hand-mapping every GraphQL field/input instead of Zod + `@vyrel/morph`
  (`exposeFields` / `inputsFrom`) when the shape already exists in Zod
- Putting Drizzle calls or Zod validation only inside resolvers
- Importing `evlog` / `@logtape/*` outside `@vyrel/logging`
- Adding model-local `lib/` instead of `packages/api/src/lib/`
- Digging into `@vyrel/morph` package sources instead of peer GraphQL files
- Barrel-exporting the whole model from a random `index.ts` unless peers already do
- Hard-coding one deleted-tomorrow domain as “the” template in docs or comments
