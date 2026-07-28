---
name: add-model-client
description: >-
  Wires a new domain model on the web client: features scaffolding, thin Next.js
  App Router pages, gql.tada documents, and @vyrel/graphql-client optimistic
  CRUD. Use when adding a dashboard feature, screen, GraphQL fragment/query/
  mutation, or client UI for an existing server model. Uses shadcn MCP for new
  UI primitives. Does not run graphql:schema, gql:generate, or gql:client.
---

# Add model (client)

Operational workflow for exposing a **domain model on the web client** after the
server GraphQL surface exists (see `add-model-server`). Follow the hierarchy
below. Mirror peers under `apps/web/src/features/*` only when you need a
concrete reference for a **file role** — do not treat any single feature as
permanent canon.

Primary target: **`apps/web`**. Mobile (`apps/mobile`) parallels the same
feature/graphql/hooks shape with Expo Router + HeroUI Native — adapt UI only;
do not share React components across platforms.

## Hard rules

1. **Write files only.** Do **not** run unless the user explicitly asks:
   - `bun graphql:schema` (or package-local schema gen)
   - `bun run --cwd apps/web gql:generate`
   - `bun run --cwd apps/web gql:client` / `gql:client:watch`
2. **Do not hand-edit** `apps/web/src/graphql/generated/client-schema.ts` or
   `apps/web/graphql-env.d.ts`.
3. **`@vyrel/graphql-client` does not invent operations.** You write fragments /
   queries / mutations; codegen builds the registry from those documents.
4. **Thin App Router pages.** Domain UI lives in `src/features/**`; `app/**`
   pages only auth-gate, preload, and render a screen.
5. **Protected GraphQL screens** belong under `app/(protected)/` (ApolloProvider).
6. **UI primitives** from `@vyrel/shared/ui`. Add missing shadcn pieces via MCP
   `project-0-vyrel-shadcn` (search → add command) into **`shared/`**, not by
   copying components into the feature.
7. **No zustand** unless the user asks — use React state, feature `context/`,
   Apollo cache, or `authClient`.
8. Prefer Zod from `@vyrel/api/models/<name>/types/...` for forms when the
   server already exports schemas.
9. After writing, **tell the user** which commands to run (never execute them
   as part of this skill).

## Feature shapes (pick one)

| Shape | Typical pieces |
|-------|----------------|
| List + full GraphQL CRUD | `graphql/*`, `hooks/`, optional `context/` + `lib/`, `components/`, `screen/`, `PreloadQuery` page |
| List + update/delete; create via REST | Queries + update/delete optimistic hooks; create uses fetch + `client.refetchQueries` |
| Singular get + update/delete | `Get*` query (no list); no create mutation |
| Auth / session forms | `screen/` + local zod + `authClient` / REST — usually **no** `graphql/` |
| UI-only | `screen/` only |

Skip folders the shape does not need.

## Target hierarchy

```
apps/web/src/features/
├── auth/                              # session flows (optional graphql)
└── dashboard/
    └── <name>/
        ├── screen/                    # page-level client UI
        ├── components/                # dialogs, lists, skeletons, fields
        ├── graphql/                   # when GraphQL-backed
        │   ├── fragments.ts
        │   ├── queries.ts
        │   ├── mutations.ts
        │   └── types.ts               # optional if types colocated
        ├── hooks/                     # use-*-mutations, filters, …
        ├── context/                   # list scope / optimistic identity
        └── lib/                       # pure helpers + tests

apps/web/app/(protected)/dashboard/
├── <route>/page.tsx                   # thin RSC → feature screen
└── management/<route>/page.tsx        # management-style routes

apps/web/src/components/sidebar-02/    # chrome only — register nav here
apps/web/src/graphql/                  # gql.tada + Apollo — shared infra
```

Path alias: `@/*` → `apps/web/src/*`.

## When optional pieces apply

| Piece | Add when |
|-------|----------|
| `graphql/` | Domain reads/writes via GraphQL |
| `hooks/use-*-mutations.ts` | Optimistic create/update/delete |
| `context/` | Shared list variables / optimistic list identity |
| `lib/` | Filter membership or pure helpers |
| `components/` | Dialogs, lists, skeletons beyond the screen |
| Sidebar route | Page should appear in dashboard chrome |
| `PreloadQuery` + `Suspense` | List/detail with known RSC variables |
| Apollo `keyArgs` in `cache.ts` | List query has filter args beyond identity keys |
| Mobile feature twin | User asks for Expo as well |

## Checklist (ordered)

### 0. Preconditions

- [ ] Server model + GraphQL operations exist (or finish `add-model-server` first)
- [ ] Know the feature **shape** (list CRUD vs singular vs REST create vs UI-only)

### 1. Scaffold feature

- [ ] Create `apps/web/src/features/dashboard/<name>/` (or top-level feature if
      not dashboard-scoped)
- [ ] Add only the folders required by the shape

### 2. GraphQL documents (agent writes)

Import `graphql` from `@/graphql/gql`.

- [ ] `graphql/fragments.ts` — e.g. `<Name>ListItemFragment` via
      `graphql(\`fragment <Name>ListItem on <Type> { … }\`)`
- [ ] `graphql/queries.ts` — list: `List<Plural>Document` / op `List…`;
      singular: `Get<Name>Document`
- [ ] `graphql/mutations.ts` — `Create|Update|Delete<Name>Document`; root fields
      prefixed `create` / `update` / `delete`; spread the list fragment on
      create/update payloads so the registry can bind
- [ ] `graphql/types.ts` — `FragmentOf` / `ResultOf` / `Optimistic*Existing` as
      needed
- [ ] Pass fragment documents as the second argument to `graphql(...)` when the
      operation spreads them

**Naming (codegen-enforced):** GraphQL name `FooBar` → export `FooBarFragment`
or `FooBarDocument`. One canonical top-level **array** query per list entity.
Create inputs should carry list-key vars (e.g. `organizationId`) so the registry
can bind the collection.

### 3. Optimistic mutation hooks (`@vyrel/graphql-client`)

```ts
import {
  collectionOverrideWhen, // filtered lists only
  createOptimisticListIdentity, // via context when needed
  removeFromCollectionVariant,
  useOptimisticCreate,
  useOptimisticDelete,
  useOptimisticUpdate,
} from "@vyrel/graphql-client";
import { toast } from "@vyrel/shared/ui";
```

- [ ] Wrap each mutation in a feature hook (`hooks/use-*-mutations.ts`)
- [ ] `optimistic` callback supplies **domain values only** — package owns
      `__typename`, temp ids, list splice, response wrapping
- [ ] Toast success/error via `@vyrel/shared/ui`
- [ ] Filtered UIs: `collectionOverrideWhen` + membership helper in `lib/`
- [ ] Reads stay on Apollo (`useQuery` / `useSuspenseQuery`) — do not invent
      package read hooks

### 4. Screen + components

- [ ] `screen/*.tsx` — `"use client"`; compose hooks + components; accept ids
      from the page (e.g. `organizationId`)
- [ ] Dialogs: `react-hook-form` + `zodResolver`; Zod from `@vyrel/api` when
      available
- [ ] Icons: `@tabler/icons-react`
- [ ] Import UI from `@vyrel/shared/ui`

### 5. UI primitives (MCP)

When a needed shadcn/shared primitive is missing:

1. MCP `project-0-vyrel-shadcn`: `search_items_in_registries` / `view_items_in_registries`
2. `get_add_command_for_items` → run add into **`shared/`** (or web-local only
   for true one-offs)
3. Optionally `get_item_examples_from_registries` for usage patterns
4. Prefer existing `@vyrel/shared/ui` exports before adding anything new

### 6. App Router page (thin)

- [ ] Add `apps/web/app/(protected)/dashboard/.../page.tsx`
- [ ] `getServerAuthState()` from `@/lib/server-session` → redirect if needed
- [ ] Optional: `PreloadQuery` + `Suspense` + skeleton from feature components
- [ ] Render feature screen with props — **no** domain GraphQL documents inlined
      in fat page UI

### 7. Chrome / cache (if needed)

- [ ] Register route in `apps/web/src/components/sidebar-02/app-sidebar.tsx`
      (`dashboardRoutes`) and/or `nav-management.tsx`
- [ ] If list has filter `keyArgs`, extend `Query` field policies in
      `apps/web/src/graphql/apollo/cache.ts`

### 8. Mobile (only if requested)

- [ ] Mirror feature under `apps/mobile/src/features/...`
- [ ] Same document naming + `@vyrel/graphql-client` hooks
- [ ] Thin Expo Router files; UI via HeroUI Native MCP / docs — **not** shadcn

### 9. Finish

Remind the user (do not run):

```text
# if server schema changed
bun graphql:schema

# gql.tada introspection types
bun run --cwd apps/web gql:generate

# fragment / CRUD registry for @vyrel/graphql-client
bun run --cwd apps/web gql:client

# mobile (if applicable)
bun run --cwd apps/mobile gql:generate
bun run --cwd apps/mobile gql:client
```

`bun run --cwd apps/web dev` / `predev` already chains schema → generate →
client when they start the app.

## How to use existing features as reference

When unsure about a **file role**, open **multiple** peers under
`apps/web/src/features/dashboard/*` (and `auth/` if session-shaped) and match
the same role (`graphql/fragments.ts`, `hooks/use-*-mutations.ts`, thin
`page.tsx`, etc.). Copy structure, not domain fields. Pair with
`add-model-server` when the API is missing.

## Package map (`@vyrel/graphql-client`)

| Import | Use |
|--------|-----|
| `@vyrel/graphql-client` | `useOptimisticCreate/Update/Delete`, collection helpers |
| `@vyrel/graphql-client/cache` | Apollo setup only (`configureGraphqlClientCache`) |
| `@vyrel/graphql-client/codegen-plugin` | `apps/web/codegen.ts` only — do not reconfigure casually |

To understand how `@vyrel/graphql-client` is used in this project, look at how
it is already implemented under `apps/web/src/features/**` (fragments, mutation
hooks, and list-scope patterns in peer features). Do not dig into the package
source tree.

## Anti-patterns

- Fat `page.tsx` with domain UI and GraphQL documents inline
- Hand-editing `client-schema.ts` / `graphql-env.d.ts`
- Manual `__typename`, temp ids, or list splicing the optimistic hooks already own
- Generating or inventing operations “for” the client package
- Domain components under `src/components/` instead of `features/`
- Duplicating shadcn under the feature when `@vyrel/shared/ui` (or MCP add into
  `shared/`) is the path
- Assuming every model has a list collection or GraphQL create
- Putting GraphQL data screens outside `(protected)` without Apollo
- Running codegen/schema commands as part of this skill without user request
- Anchoring docs or comments to one feature folder as the only valid template
