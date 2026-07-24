# V1 contract and architecture

Status: accepted and implemented.

## Decision

`@vyrel/graphql-client` is an Apollo-first React package that reduces mutation
and optimistic-cache boilerplate. Its API is operation-driven and configured at
the call site. It does not create a mandatory global resource definition for
each GraphQL model.

The public runtime consists of three explicit hooks:

- `useOptimisticCreate`
- `useOptimisticUpdate`
- `useOptimisticDelete`

The generated registry describes the canonical query-backed array for
create/delete membership changes. Reads keep using Apollo `useQuery`.

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
6. Prepend it to the canonical list and deduplicate by normalized cache ID.
7. If the call site passes optional `collection` (object or function of mutation
   variables returning `{ query, variables } | undefined`), also prepend to that
   exact list variant (dual-write; never replaces the canonical write). When both
   target the same slot, dedupe keeps a single entry.
8. Repeat the same list behavior for the server result when Apollo removes the
   optimistic layer.

The package does not interpret list filters (`search`, date ranges, etc.). Only
variables resolvable from the mutation feed the canonical write. Filtered
variants are the application's responsibility via the optional `collection`
override (pass it only when membership is known) or via Apollo
`refetchQueries` / query `refetch`.

`prependToCollectionVariant`, `removeFromCollectionVariant`, and
`collectionOverrideWhen` are the public mechanical helpers behind list variant
updates and the supported escape hatch for custom `update` callbacks. Domain
membership stays in the application.

### Update

1. Merge `current` and the on-demand optimistic patch.
2. Add the inferred typename and mutation response wrapper.
3. Let Apollo normalize the entity. All cached consumers of the same identity
   update without a list rewrite.
4. Filtered-list membership changes (e.g. title no longer matches `search`) are
   the application's responsibility via `update` + `removeFromCollectionVariant`.

### Delete

1. Derive the ID from typed mutation variables.
2. Build the scalar optimistic mutation response.
3. Remove the entity from every cached argument variant of its canonical list.
4. Evict and garbage-collect its normalized record.

The ID callback remains the source of the normalized cache key for both the
optimistic and server-result updates. The response scalar is not assumed to use
the same identity domain as the configured Apollo key field.

Apollo's `update` callback is composed after the built-in behavior, so consumers
can extend any exceptional cache workflow without forking the package.

## Package boundaries

```text
@vyrel/graphql-client
├── React hooks
├── document inference
├── canonical collection adapter
├── collectionOverrideWhen helper
├── prependToCollectionVariant helper
├── removeFromCollectionVariant helper
└── createOptimisticListIdentity helper

@vyrel/graphql-client/cache
├── per-cache registry configuration
├── collectionOverrideWhen helper
├── prependToCollectionVariant helper
├── removeFromCollectionVariant helper
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
- interpreting filtered-list membership (search, dates, permissions);
- updating every cached list variant on create;
- UI toasts, pending states or error presentation;
- React list-key tracking unless explicitly enabled with `identity` and
  `createOptimisticListIdentity`;
- offline persistence, mutation queues, undo or conflict resolution;
- nested/Relay connection pagination adapters.

These boundaries keep V1 small while leaving explicit extension points. A
future connection adapter can reuse the hook lifecycle without changing the
operation-driven API.
