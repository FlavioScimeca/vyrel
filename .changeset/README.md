# Changesets

This folder stores [Changesets](https://github.com/changesets/changesets) — one markdown file per intended release.

## When to add a changeset

Add a changeset when your PR changes a **public** package:

- `packages/public/morph` → `@vyrel/morph`

Private apps and internal packages are ignored (see `config.json` → `ignore`).

## Create a changeset

```bash
bun run changeset
```

Usually `bun run commit` prompts you for bump type and summary when you change `packages/public/**`. The hook writes a file in `.changeset/` and stages it for the same commit.

Manual creation is useful when you want full control over bump type and summary before committing.

Follow the prompts:

1. Select the package(s) to release
2. Choose bump type (`patch`, `minor`, `major`)
3. Write a changelog summary

Commit the generated `.md` file in this folder with your PR.

CI blocks merge if public package files change without a changeset. Add the **`skip-changeset`** PR label to bypass when no npm release is intended.

## Release (automated)

You normally **do not** run these locally. On merge to `main`, `.github/workflows/release.yml`:

1. Opens or updates a **Version Packages** PR when unreleased changesets exist
2. After that PR merges, runs `bun run release` to build and publish to npm

| Command | Used by |
|---------|---------|
| `bun run changeset` | developers |
| `bun run version-packages` | Version PR (CI) |
| `bun run release` | publish step (CI) |

## Manual release (fallback)

```bash
bun run version-packages
bun run release
```

Use only when CI is unavailable.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full workflow.
