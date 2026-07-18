# @vyrel/graphql-client

Small, type-safe React helpers for Apollo mutations and optimistic cache updates.
The package is operation-driven: pass only the mutation at the call site. Its
GraphQL Codegen plugin generates the gql.tada fragment types and canonical CRUD
collection registry without generating one hook per resource.

```bash
bun | yarn add @vyrel/graphql-client @apollo/client graphql react
```

## Why

Apollo already provides an excellent normalized cache and typed hooks. The
repetitive part is connecting optimistic responses to that cache:

- wrapping an entity in the correct mutation response field;
- repeating `__typename`, temporary IDs and unchanged fields;
- manually inserting and removing items from query results;
- keeping optimistic and server-result updates consistent;
- adding casts around fragment-masked gql.tada documents.

`@vyrel/graphql-client` handles those mechanical steps while leaving domain
values, GraphQL operations and Apollo options in application code.

## Create

```ts
import { useOptimisticCreate } from "@vyrel/graphql-client";

const [createTask] = useOptimisticCreate(CreateTaskDocument, {
  optimistic: ({ input }) => ({
    description: input.description ?? null,
    imageFull: null,
    imageThumb: null,
    title: input.title,
  }),
});
```

The callback variables come from `CreateTaskDocument`. The generated registry
connects the mutation's `...TaskListItem` spread to
`ResultOf<typeof TaskListItemFragment>`, so its selected fields are available to
TypeScript without passing the fragment at every call site. At runtime the
package reads the same fragment definitions from the gql.tada document, infers
`Task`, creates a temporary `id`, adds conventional `createdAt` and `updatedAt`
values when selected and builds the mutation response. The generated registry
maps `Task` to `ListTasksDocument` and maps its `organizationId` variable to
`CreateTask.input.organizationId`, so both the optimistic and real entity are
prepended automatically.

The optimistic callback intentionally remains explicit. A generic library
cannot safely invent a title, price, status or other domain value.

## Update on demand

Each call site chooses only the fields it wants to change.

```ts
const [renameTask] = useOptimisticUpdate(UpdateTaskDocument, {
  current: task,
  optimistic: ({ input }) => ({
    title: input.title ?? task.title,
  }),
});
```

Another screen can update a different patch without defining another resource:

```ts
const [editTask] = useOptimisticUpdate(UpdateTaskDocument, {
  current: task,
  optimistic: ({ input }) => ({
    description: input.description ?? task.description,
    title: input.title ?? task.title,
  }),
});
```

Apollo normalizes the partial optimistic entity using its typename and ID, so
every query containing the same entity sees the update. A list rewrite is not
needed for ordinary updates.

## Delete

```ts
const [deleteTask] = useOptimisticDelete(DeleteTaskDocument, {
  id: ({ input }) => input.taskId,
});
```

The package builds the scalar optimistic response, finds `Task` through the
generated mutation registry, removes the item from every cached argument variant
of the canonical `tasks` collection and evicts its normalized entity.

## Apollo options and escape hatches

Normal `useMutation` options stay at the top level and keep their Apollo types:

```ts
useOptimisticCreate(CreateTaskDocument, {
  optimistic: ({ input }) => ({ title: input.title }),
  onCompleted: () => notifySuccess(),
  onError: (error) => notifyError(error.message),
  refetchQueries: [DashboardDocument],
  update: (cache, result, context) => {
    // Runs after @vyrel/graphql-client's built-in cache behavior.
  },
});
```

Pass `field` when a mutation has multiple top-level fields. Cache key fields are
generated from the plugin configuration (and default to `id`); `keyField` remains
an override, while `optimisticId` supplies a custom temporary-ID strategy.

Reads continue to use Apollo's `useQuery`. It is already concise and fully typed;
wrapping it would add an abstraction without removing meaningful boilerplate.

## Required codegen

The package is designed around gql.tada and uses the official GraphQL Code
Generator document scanner. Install its CLI as a development dependency:

```bash
bun add --dev @graphql-codegen/cli
```

The `@vyrel/graphql-client/codegen-plugin` custom plugin receives the parsed
schema and documents from GraphQL Codegen. It only implements Vyrel-specific
knowledge: fragment type augmentation, canonical list discovery, CRUD mutation
association and mutation-to-query variable binding.

```ts
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/graphql/generated/**"],
  pluckConfig: { globalGqlIdentifierName: ["graphql"] },
  generates: {
    "src/graphql/generated/client-schema.ts": {
      plugins: [
        {
          "@vyrel/graphql-client/codegen-plugin": {
            keyFields: { Organization: "slug" },
            scalars: { DateTime: "string" },
          },
        },
      ],
    },
  },
};

export default config;
```

Documents follow the gql.tada export convention: fragment `TaskListItem` is
exported as `TaskListItemFragment`, and operation `ListTasks` as
`ListTasksDocument`. Codegen validates these export names. A mutation can spread
multiple fragments and select multiple CRUD root fields; their result types and
per-field variable bindings are generated independently.

Register the generated runtime registry once for each Apollo cache. The `/cache`
entry is isomorphic and does not import the React client bundle:

```ts
import { configureGraphqlClientCache } from "@vyrel/graphql-client/cache";
import {
  graphqlClientRegistry,
  graphqlClientTypePolicies,
} from "./generated/client-schema";

const cache = configureGraphqlClientCache(
  new InMemoryCache({
    typePolicies: graphqlClientTypePolicies,
  }),
  graphqlClientRegistry
);
```

```ts
import type { GraphqlClientModel } from "./client-schema";

type Task = GraphqlClientModel<"Task">;
```

`Task` has autocomplete for every field currently present in the schema. The
generated artifact also records enum values, nested list/nullability structure,
configured cache keys and custom scalar mappings. It exports
`graphqlClientTypePolicies`, keeping Apollo normalization aligned with the
generated optimistic registry.

The generated artifact also exports schema metadata for `ModelOf` extensions.
The `/codegen` and `/codegen-plugin` exports never enter the React bundle.

## V1 boundaries

- Apollo Client 4 with React 18.2 or React 19 is supported.
- Mutations may contain multiple CRUD root fields; `field` selects the one used
  by a hook. Canonical collection queries contain one top-level list field.
- Canonical collections are top-level arrays. When multiple list queries return
  the same entity, the unique `List<Field>` operation is canonical; unresolved
  ambiguity fails code generation.
- Optimistic create/update/delete are included. Offline queues, undo, conflict
  resolution and UI notifications remain outside the core.
- The package does not generate operations or replace Apollo or gql.tada.

See [docs/flow-a-z.md](./docs/flow-a-z.md) for the complete server-to-client
flow and [docs/contract-v1.md](./docs/contract-v1.md) for the architectural
contract.
