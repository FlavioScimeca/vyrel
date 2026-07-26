# @vyrel/graphql-client

Operation-driven React helpers for Apollo mutations and optimistic cache
updates. Pass the mutation document at the call site; a GraphQL Codegen plugin
builds the gql.tada fragment registry and canonical CRUD collection map — without
generating one hook per resource.

```bash
bun add @vyrel/graphql-client @apollo/client graphql react
bun add --dev @graphql-codegen/cli gql.tada
```

## Entry points

| Import | Contents | Use from |
| --- | --- | --- |
| `@vyrel/graphql-client` | Optimistic hooks + helpers (`collectionOverrideWhen`, `createOptimisticListIdentity`, …) | Client components |
| `@vyrel/graphql-client/cache` | Registry binding + collection write helpers | Apollo setup / RSC (no React) |
| `@vyrel/graphql-client/codegen` | Schema metadata types / utilities | Build tooling |
| `@vyrel/graphql-client/codegen-plugin` | GraphQL Code Generator plugin | `codegen.ts` (Node) |

## Why

Apollo already provides a normalized cache and typed hooks. The repetitive part
is wiring optimistic responses to that cache:

- wrapping an entity in the correct mutation response field
- repeating `__typename`, temporary IDs, and unchanged fields
- inserting and removing items from list query results
- keeping optimistic and server-result updates consistent
- casting around fragment-masked gql.tada documents

`@vyrel/graphql-client` owns those mechanical steps. Domain values, GraphQL
operations, and Apollo options stay in application code.

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
`ResultOf<typeof TaskListItemFragment>`, so selected fields are available to
TypeScript without passing the fragment at every call site.

At runtime the package reads the same fragment definitions from the gql.tada
document, infers `Task`, creates a temporary `id`, adds conventional
`createdAt` / `updatedAt` when selected, and builds the mutation response. The
registry maps `Task` → `ListTasksDocument` and binds
`organizationId` ← `CreateTask.input.organizationId`, so the entity is prepended
to the canonical list automatically.

The optimistic callback stays explicit: a generic library cannot safely invent
titles, prices, or other domain values.

Use `placement: "append"` when new items belong at the end (default:
`"prepend"`).

### Filtered lists (dual-write)

The canonical collection uses only variables resolvable from the mutation (for
example `{ organizationId }`). When the UI query has extra `keyArgs` filters,
pass an optional `collection` override — the package writes the canonical slot
**and** the visible variant:

```ts
import {
  collectionOverrideWhen,
  useOptimisticCreate,
} from "@vyrel/graphql-client";

useOptimisticCreate(CreateTaskDocument, {
  optimistic: ({ input }) => ({
    description: input.description ?? null,
    title: input.title,
  }),
  collection: ({ input }) =>
    collectionOverrideWhen({
      query: ListTasksDocument,
      variables: activeListVariables,
      when: taskBelongsToVisibleList(
        { description: input.description ?? null, title: input.title },
        activeListVariables
      ),
    }),
});
```

Membership stays in the application; the package only performs the cache write.

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

`current` must contain every field selected by the mutation fragment (TypeScript
enforces this). `optimistic` remains a partial on-demand patch. Ordinary updates
do not rewrite list membership; use `removeFromCollectionVariant` in `update`
when a field change should drop the entity from a filtered visible list.

## Delete

```ts
const [deleteTask] = useOptimisticDelete(DeleteTaskDocument, {
  id: ({ input }) => input.taskId,
});
```

The package builds the scalar optimistic response, removes the item from every
cached argument variant of the canonical collection (when one exists), and
evicts the normalized entity. The `id` callback is the sole source of the Apollo
cache key.

## Server freshness

The package does not refetch. The component that owns the query also owns
`refetch`:

```ts
const { refetch } = useQuery(ListTasksDocument, { variables: filters });
const [createTask] = useOptimisticCreate(CreateTaskDocument, options);

await createTask({ variables: { input } });
await refetch();
```

## Stable list keys after create

Apollo replaces the temporary create id with the server id. If the list uses
`key={entity.id}`, React remounts the row. Opt into a per-feature identity
tracker:

```ts
import {
  createOptimisticListIdentity,
  useOptimisticCreate,
} from "@vyrel/graphql-client";

const taskListIdentity = createOptimisticListIdentity();

const [createTask] = useOptimisticCreate(CreateTaskDocument, {
  identity: taskListIdentity,
  optimistic: ({ input }) => ({ title: input.title }),
});

// <Row key={taskListIdentity.getKey(task.id)} task={task} />
```

Pass the same `identity` to `useOptimisticDelete`. Call `clear()` when the
owning feature unmounts.

## Apollo options and escape hatches

Normal `useMutation` options stay at the top level:

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

For mutations with multiple top-level fields, `field` is required and
autocompletes valid response keys. Cache key fields are configured only in
codegen (default `id`). Per-call `update` replaces the hook-level application
callback (Apollo semantics); built-in cache behavior always runs first.

Reads continue to use Apollo `useQuery`.

## Required codegen

Documents are written with gql.tada. GraphQL Code Generator scans them; the
Vyrel plugin adds fragment type augmentation, canonical list discovery, CRUD
mutation association, and mutation→query variable binding.

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
            // Use only immutable, single-field identities.
            keyFields: { Article: "uuid" },
            scalars: { DateTime: "string" },
          },
        },
      ],
    },
  },
};

export default config;
```

Export convention: fragment `TaskListItem` → `TaskListItemFragment`; operation
`ListTasks` → `ListTasksDocument`. Codegen validates export names and that cache
keys exist in the schema and are selected without aliases.

Register the generated registry once per Apollo cache:

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

## 0.2 boundaries

- Apollo Client 4 with React 18.2 or React 19
- Multi-root mutations: `field` is a required typed response key
- Canonical collections are top-level arrays; ambiguous list queries fail codegen
- Optimistic create / update / delete included
- Offline queues, undo, conflict resolution, and UI notifications stay outside
- Does not generate operations or replace Apollo / gql.tada

## Docs

- [Flow A→Z](./docs/flow-a-z.md) — full server-to-client pipeline
- [Contract v1](./docs/contract-v1.md) — architectural contract

## License

MIT
