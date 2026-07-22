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

