# Contributing to Vyrel

Vyrel is a **private** monorepo. Only packages under `packages/public/*` are published to npm.

Today the public package is:

- `@vyrel/morph` → `packages/public/morph`

Everything else (`apps/*`, `packages/*`) stays private and is never published.

## Development

```bash
bun install
bun run db:push   # if you work on database-backed features
bun run dev
```

Useful checks before opening a PR:

```bash
bun run lint
bun run check-types
bun run test
bun run preflight   # full local gate (also runs on pre-push)
```

## Commits

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
type(scope): short description
```

Examples:

```text
feat(morph): add computed enum field helper
fix(api): handle nullable user image fields
chore(ci): pin bun version in workflows
docs(morph): expand README quick start
```

### Types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Scopes

| Scope | Area |
|-------|------|
| `morph` | `@vyrel/morph` |
| `web` | Next.js app |
| `server` | Elysia API |
| `api` | `@vyrel/api` |
| `graphql` | `@vyrel/graphql` |
| `auth` | `@vyrel/auth` |
| `db` | `@vyrel/db` |
| `docs` | documentation app |
| `extension` | browser extension |
| `config` | shared config |
| `ci` | GitHub Actions, hooks |
| `deps` | dependency updates |
| `release` | versioning / publish |
| `root` | repo-wide changes |

Commit messages are validated locally by **Commitlint** (`.husky/commit-msg`).

Pull request titles are validated by the **Semantic Pull Request** workflow. With squash merge, the PR title becomes the commit on `main`, so keep it in the same format.

## Git hooks

| Hook | Runs |
|------|------|
| `pre-commit` | blocks commits on `main` / `master`, then `deps:lint` (syncpack) |
| `commit-msg` | commitlint |
| `pre-push` | knip, lint, types, build, test |

Branch protection on private repos requires a paid GitHub plan, so commits on `main` are blocked locally via the pre-commit hook. Use a feature branch and open a PR to merge.

## Changesets

When a PR changes a **public** package under `packages/public/*`, it must include a changeset.

```bash
bun run changeset
```

Changesets records:

- which package to release (`@vyrel/morph`, …)
- semver bump (`patch`, `minor`, `major`)
- a short summary for the changelog

Commit the generated file in `.changeset/` with your PR.

CI enforces this via **Require Changeset** (`.github/workflows/require-changeset.yml`).

To skip intentionally (internal refactors, test-only follow-ups, etc.), add the **`skip-changeset`** label to the PR.

Test-only changes under `packages/public/**` (`*.test.ts`, `*.spec.ts`) do not trigger the check.

Private apps and packages are listed in `.changeset/config.json` → `ignore` and will never be offered for release.

## Release flow

Releases are automated on `main` via `.github/workflows/release.yml` and [Changesets](https://github.com/changesets/changesets).

```text
PR with changeset
      ↓
merge to main
      ↓
GitHub Action opens/updates "chore: version packages" PR
      ↓
merge Version PR
      ↓
build:verified on public packages
      ↓
publish to npm (Trusted Publishing / OIDC)
```

You do **not** need to run `version-packages` or `release` manually in the normal flow.

### What each script does

| Script | Purpose |
|--------|---------|
| `bun run changeset` | create a changeset file (developer) |
| `bun run version-packages` | bump versions + changelogs (CI / Version PR) |
| `bun run release` | verified build + `changeset publish` (CI) |

## Adding a new public package

1. Create the package under `packages/public/<name>`
2. Set `"publishConfig": { "access": "public" }` — do **not** set `"private": true`
3. Do **not** add it to `ignore` in `.changeset/config.json`
4. Add a `build:verified` script and `prepublishOnly` if appropriate
5. Configure npm Trusted Publishing for the new package

## CI

On every PR and push to `main`:

- **CI** — lint, typecheck, build, test (includes `@vyrel/morph`)
- **Semantic PR** — validates PR title format
- **Require Changeset** — fails if `packages/public/**` changes without a changeset (unless `skip-changeset` label)

## Manual publish (emergency only)

If CI publish fails and you need to publish manually:

```bash
cd packages/public/morph
bun run build:verified
npm login
npm publish --access public
```

Prefer fixing the release workflow over manual publishes.

## Questions

Open an issue on GitHub or discuss in your PR.
