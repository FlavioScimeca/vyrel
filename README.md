<div align="center">
  <picture>
    <source srcset="./logo.png"/>
    <img src="./logo.png" width="120" height="120"  alt="Vyral logo"/>
  </picture>
</div>

# Vyrel

TypeScript monorepo — Next.js, Elysia, GraphQL, SQLite.

## Getting started

```bash
bun install
bun run db:push
bun run dev

npx heroui-cli@latest agents-md --native
```

- Web → [localhost:3001](http://localhost:3001)
- API → [localhost:3000](http://localhost:3000)

## Scripts

- `bun run dev` — start development
- `bun run build` — production build
- `bun run test` — run tests
- `bun run db:push` — push database schema
- `bun run db:studio` — open Drizzle Studio

## Structure

```
apps/web       Next.js frontend
apps/server    Elysia API
packages/      api, auth, db, graphql, …
packages/public/morph   @vyrel/morph (published to npm)
packages/public/graphql-client   @vyrel/graphql-client (published to npm)
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for commit conventions, changesets, and the release workflow.

## Cursor agents

### Effect diagnostics

Runs `bun run effect:diagnostics` (`effect-tsgo` + turbo), then opens failing
files and applies idiomatic Effect fixes (uses the Effect MCP docs server when
unsure). Defined in [`.cursor/agents/agent-diagnostics.md`](./.cursor/agents/agent-diagnostics.md).

Paste into Cursor Agent chat:

```text
@.cursor/agents/agent-diagnostics.md run diagnostics and fix
```

### Preflight

Runs `bun run preflight` (deps lint, ultracite, knip, typecheck, build, tests —
same gate as CI / pre-push), then fixes failures until green. Routes to the
correct MCP / skill by failure type (Effect, Next, HeroUI Native, Better Auth,
Ultracite, Turborepo, …). Defined in [`.cursor/agents/agent-preflight.md`](./.cursor/agents/agent-preflight.md).

Paste into Cursor Agent chat:

```text
@.cursor/agents/agent-preflight.md run preflight and fix
```

### Release (changeset)

Uses **read-only git** (commits ahead of `main` + uncommitted changes) to detect
publishable edits under `packages/public/*`, then creates/updates **changeset
summary content** only. No version bumps, no `git add` / commit. **May only
write inside `.changeset/`.** Defined in
[`.cursor/agents/agent-release.md`](./.cursor/agents/agent-release.md).

Paste into Cursor Agent chat:

```text
@.cursor/agents/agent-release.md prepare changeset from commits ahead of main
```
