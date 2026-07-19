# Vyrel Documentation

This Fumadocs application is the canonical documentation for the Vyrel
monorepo, its applications and internal packages, and the public
`@vyrel/morph` and `@vyrel/graphql-client` libraries.

## Commands

- `bun run dev` — start the docs app on port 4000
- `bun run build` — generate MDX data and build the Next.js app
- `bun run check-types` — generate MDX data and run TypeScript

From the repository root, the equivalent filtered commands are
`bun run dev:docs`, `bun run build:docs`, and `bun run check:docs`.

## Content structure

Add English MDX pages under `content/docs`. Top-level sections cover getting
started, the monorepo, applications, internal packages, architecture, public
packages, and contributing.

Every page must include `title` and `description` frontmatter. Folder
`meta.json` files control sidebar order and act as page allow-lists, so add a new
page to its folder metadata as part of the same change.

Use absolute internal links beginning with `/docs/`. Fumadocs' default MDX
registry provides Cards, Callouts, tables, highlighted code, and heading links.
Do not edit `.source/` or `.next/` output.

## Verification

```bash
bun run check:docs
bun run build:docs
bunx ultracite check apps/docs
```

For content changes, also verify sidebar ordering, search results, internal and
external links, mobile navigation, and light/dark themes.
