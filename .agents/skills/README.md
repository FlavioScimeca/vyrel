# Project Skills

Project-local agent skills for this monorepo. Each sibling directory has a
`SKILL.md`.

## First-party domain skills

| Skill | Use when |
| --- | --- |
| `add-model-server` | New Drizzle/Effect/Zod/Morph GraphQL domain under `packages/db` + `packages/api` |
| `add-model-client` | New web dashboard feature + gql.tada + `@vyrel/graphql-client` optimistic CRUD |

## Other skills

Includes logging review, Ultracite, Turborepo, HeroUI Native, Better Auth,
Elysia, Vercel React / composition guides, and related helpers.

The `better-fullstack` skill covers generated-scaffold habits (prefer Bun,
avoid starting dev servers unless asked). Prefer the domain skills above for
model/feature work in this repo.

See also root [`AGENTS.md`](../../AGENTS.md) and
[`TEMPLATE_CONVERSION.md`](../../TEMPLATE_CONVERSION.md).
