# Template Conversion Checklist

Turn this monorepo from the **Vyrel** product repo into a reusable **starter template**.

Work through the sections in order. Prefer mechanical renames and deletions over redesign. Do **not** modify `apps/docs` (the Fumadocs app and its content stay as-is for now).

---

## 1. Remove — Changesets

Delete the publish/versioning surface:

- [ ] Remove `.changeset/` (config, README, pending changesets)
- [ ] Remove `@changesets/cli` from root `package.json` `devDependencies`
- [ ] Remove root scripts: `changeset`, `version-packages`
- [ ] Strip changeset prompts / branches from `script/commit.ts`
- [ ] Delete changeset-only scripts when nothing else imports them:
  - `script/changeset-utils.ts`
  - `script/ensure-changeset.ts`
  - `script/amend-changeset.ts`
- [ ] Remove husky / commitlint hooks that enforce or amend changesets (if any)

---

## 2. Remove — Release / publish CI

- [ ] Delete `.github/workflows/release.yml` (version PR + npm publish / OIDC)
- [ ] Remove the `changeset` job from `.github/workflows/ci.yml` (public-package changeset gate)
- [ ] Delete or gut `script/release.ts` and the root `release` script
- [ ] Drop any npm trusted-publishing / `NODE_AUTH_TOKEN` / OIDC docs outside `apps/docs`

---

## 3. Remove — Public-package root scripts & workspace publish wiring

Keep app functionality; remove the **publish pipeline**, not necessarily the library source (see § AI notes).

- [ ] Remove root scripts: `build:public`, `build:verified`
- [ ] Update `preflight` so it no longer runs public build/verify steps
- [ ] Remove `packages/public/*` from root `workspaces.packages` **only after** packages are moved or dependencies are rewired
- [ ] Clean `knip.json`, `.syncpackrc.json`, `turbo.json`, and related filters that target `packages/public/*` publish flows
- [ ] Remove `publint` / size / `build:verified` scripts that exist only for npm packages (if any remain after move)

---

## 4. Remove — Publish docs (markdown only; leave `apps/docs` alone)

Do **not** edit or delete anything under `apps/docs/`.

Outside that app, strip product/publish narrative:

- [ ] `README.md` — remove npm / `packages/public` publish sections; rewrite as template intro
- [ ] `CONTRIBUTING.md` — remove release / changeset / npm publish instructions (or replace with template contribution notes)
- [ ] Root docs such as `DEVELOPMENT_EXPERIENCE.md` — remove or rephrase Vyrel-as-product and public-package release flows
- [ ] Leave `apps/docs/**` untouched (including `content/docs/public-packages/`)

---

## 5. Rename — Package scope

Replace the npm scope and root name everywhere they appear in package manifests and tooling:

| Current | Target |
| --- | --- |
| Root `"name": "vyrel"` | New template root name (from user) |
| `@vyrel/*` | `@<new-scope>/*` |

Packages today:

- `@vyrel/api`, `@vyrel/auth`, `@vyrel/bun-porting`, `@vyrel/config`, `@vyrel/consts`
- `@vyrel/db`, `@vyrel/env`, `@vyrel/graphql`, `@vyrel/logging`, `@vyrel/storage`
- `@vyrel/shared`
- `@vyrel/morph`, `@vyrel/graphql-client` (under `packages/public/` until relocated)

Checklist:

- [ ] Rename each `package.json` `"name"`
- [ ] Update all `workspace:*` dependency references
- [ ] Update root scripts that filter by package name (`turbo -F @vyrel/db`, `bun run --filter @vyrel/graphql`, …)
- [ ] Update TypeScript path / `extends` references (e.g. `@vyrel/config/tsconfig.base.json`)
- [ ] Reinstall / refresh lockfile after renames (`bun install`)

---

## 6. Rename — Expo (mobile) app

In `apps/mobile` (and related env / e2e):

- [ ] `app.config.js`: `name`, `slug`, `scheme`
- [ ] iOS `bundleIdentifier`, Android `package`
- [ ] User-facing permission strings that say “Vyrel”
- [ ] Package name `vyrel-mobile` in `apps/mobile/package.json`
- [ ] `APP_SLUG` default / examples (`packages/env`, `.env.example`)
- [ ] Maestro e2e `APP_ID` values in scripts and flows

Use placeholder-friendly IDs (e.g. `com.example.<template>`) unless the user supplies real ones.

---

## 7. Rename — Imports and scripts

After scope rename, fix remaining code references (not every prose file—focus on build-breaking paths):

- [ ] Source imports: `from "@vyrel/..."` → `from "@<new-scope>/..."`
- [ ] Codegen configs (`codegen.ts`, gql client scripts) that invoke `@vyrel/graphql-client`
- [ ] Server / web / extension / mobile entrypoints and env helpers
- [ ] Agent skills that hard-code `@vyrel/...` import paths (e.g. `.agents/skills/add-model-*`)

---

## 8. Rename — Personal / repo identity

Replace author- and product-specific identity with template placeholders:

- [ ] GitHub URLs (`FlavioScimeca/vyrel`, homepage / bugs / repository fields)
- [ ] Bundle IDs / packages under `com.flavio-scimeca.*` / `com.flavio_scimeca.*`
- [ ] Example env values that embed `vyrel` (bucket names, DB URLs in **`.env.example` only** — never commit real `.env` secrets)
- [ ] Extension `package.json` description and similar product strings
- [ ] Root / marketing copy that assumes a shipped product named Vyrel

---

## 9. Rename — Docs and agent files (outside `apps/docs`)

- [ ] `AGENTS.md`, `CLAUDE.md`, `.cursorrules` — project name, structure notes, public-package publish mentions
- [ ] `.agents/skills/**` and `.claude/skills/**` that describe Vyrel-specific publish or `@vyrel` scope
- [ ] Root `README.md` / `CONTRIBUTING.md` titles and intro (template-oriented)

---

## AI handoff — branding name & open decisions

> **For the coding agent:** before bulk rename or deleting library code, continue the chat with the user and resolve the items below. Record answers at the top of this file or in the conversation, then proceed.

### Ask the user

1. **Template / monorepo name**
   - Human name (README, Expo display name)
   - npm/workspace scope (e.g. `@acme`, `@better-fullstack`)
   - Root `package.json` `"name"`
   - Suggested Expo `slug` / URL scheme

2. **`packages/public` libraries (`morph`, `graphql-client`)**
   - **Recommended default:** stop publishing; **move** to private workspace packages (e.g. `packages/morph`, `packages/graphql-client`) and keep imports under the new scope.
   - Alternative: delete them and refactor consumers (large follow-up — only if the user explicitly wants it).

3. **Optional later (do not block the checklist)**
   - Strip or keep sample domain (tasks, orgs) as template demo data
   - Replace logos / Expo icons with neutral placeholders
   - Whether to drop `apps/extension` from the template
   - Whether to later slim or rewrite `apps/docs` (out of scope until the user asks)

### Suggested conversation opener

Ask something like:

> What should the template be called (display name + `@scope`)? Confirm we **move** `morph` / `graphql-client` to private packages instead of deleting them. Any preferred Expo bundle ID prefix?

Once answered, apply §§ 1–9 with that branding, then run a smoke path: `bun install`, `bun run check-types` (or package-local equivalents), and a quick web/server boot if the user requests it.

---

## Out of scope (for now)

- Editing or deleting `apps/docs`
- Redesigning the dashboard UI
- Publishing anything to npm
- Force-pushing or rewriting git history
