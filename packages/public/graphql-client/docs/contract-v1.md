# V1 contract and architecture

Status: accepted and implemented.

## Decision

`@vyrel/graphql-client` is an Apollo-first React package that reduces mutation
and optimistic-cache boilerplate. Its API is operation-driven and configured at
the call site. It does not create a mandatory global resource definition for
each GraphQL model.

The public runtime consists of four explicit hooks:

- `useCollectionQuery`
- `useOptimisticCreate`
- `useOptimisticUpdate`
- `useOptimisticDelete`

The generated registry describes the canonical query-backed array for
create/delete membership changes. Filtered create screens can use
`useCollectionQuery` to bind a document, its exact variables and an optional
membership predicate into a typed collection handle.

## Type sources

There are two different, complementary kinds of knowledge:

1. A gql.tada document knows the variables and fragment references of one
   operation. Generated module augmentation maps those references to the full
   selected fragment result types.
2. A GraphQL schema knows all current and future model fields. The Node-only
   GraphQL Codegen plugin converts it into typed metadata and a runtime CRUD
   registry.

Codegen is mandatory and runs before development and production builds. The
public hooks therefore never accept a manual `fragment` option or compatibility
fallbacks for other document generators.

## Inference rules

- One or more mutation root fields: register every CRUD field by response key,
  including aliases; `field` selects one at the call site.
- Exactly one collection-query root field: preserve both its response key and
  underlying Apollo store field name.
- One or more mutation fragments: combine their fields and infer `__typename`
  when they describe the same entity type.
- One list query for an entity, or one unambiguous `List<Field>` operation:
  register it as the canonical collection.
- Create query variables: bind each mutation field independently from equal
  variable names or nested input fields, with `ID` and `String` treated as
  compatible string identities.
- Cache key: read the generated plugin configuration, default to `id`, and allow
  a call-site override.
- Create ID: default to `optimistic-${randomUUID}`.
- Delete typename: obtain it from the generated CRUD mutation registry.
- Selected `createdAt` and `updatedAt`: default to the current ISO timestamp on
  create when the optimistic patch does not provide them.

Document export convention violations and inference ambiguity produce early
descriptive codegen errors. `field`, `keyField` and `optimisticId` remain
explicit operation/cache controls.

## Cache flow

### Create

1. Obtain domain fields from the typed optimistic callback.
2. Add inferred identity and conventional timestamps.
3. Wrap the entity under the mutation response key.
4. Let Apollo normalize it.
5. Resolve the canonical query variables from mutation variables.
6. Prepend it to the selected list and deduplicate by normalized cache ID.
7. Repeat the same list behavior for the server result when Apollo removes the
   optimistic layer.

When `insertInto` is provided, steps 5 and 6 target that exact collection handle
instead. Its `matches` predicate decides membership; `false` and `"unknown"`
both skip insertion. The canonical collection is not also modified.

### Update

1. Merge `current` and the on-demand optimistic patch.
2. Add the inferred typename and mutation response wrapper.
3. Let Apollo normalize the entity. All cached consumers of the same identity
   update without a list rewrite.

### Delete

1. Derive the ID from typed mutation variables.
2. Build the scalar optimistic mutation response.
3. Remove the entity from every cached argument variant of its canonical list.
4. Evict and garbage-collect its normalized record.

Apollo's `update` callback is composed after the built-in behavior, so consumers
can extend any exceptional cache workflow without forking the package.

## Package boundaries

```text
@vyrel/graphql-client
├── React hooks
├── document inference
└── canonical collection adapter

@vyrel/graphql-client/cache
├── per-cache registry configuration
└── no React client boundary

@vyrel/graphql-client/codegen-plugin
├── GraphQL Codegen custom plugin
├── schema metadata generator
├── gql.tada fragment registry generator
├── canonical CRUD collection inference
└── ModelOf type utilities
```

The hook bundle starts with `"use client"`. Cache configuration is isomorphic;
the codegen bundles are separate Node entry points.

## V1 non-goals

- replacing Apollo cache policies;
- generating GraphQL operations;
- inventing domain-specific optimistic values;
- UI toasts, pending states or error presentation;
- offline persistence, mutation queues, undo or conflict resolution;
- nested/Relay connection pagination adapters.

These boundaries keep V1 small while leaving explicit extension points. A
future connection adapter can reuse the hook lifecycle without changing the
operation-driven API.
