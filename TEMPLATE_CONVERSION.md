# Template Conversion Checklist

Turn this monorepo from the **Vyrel** product repo into a reusable **starter template**.

Work through the sections in order. Prefer mechanical renames and deletions over redesign. Do **not** modify `apps/docs` (the Fumadocs app and its content stay as-is for now).

Canonical repo context for agents lives in [`AGENTS.md`](./AGENTS.md), [`.cursorrules`](./.cursorrules), and [`CLAUDE.md`](./CLAUDE.md) — update those as part of §9 after branding is chosen.

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
- [ ] Clear husky hooks that call those scripts:
  - `.husky/prepare-commit-msg` → `ensure-changeset.ts`
  - `.husky/post-commit` → `amend-changeset.ts`
- [ ] Delete `.cursor/agents/agent-release.md` and remove Release agent section from `README.md`

---

## 2. Remove — Release / publish CI

- [ ] Delete `.github/workflows/release.yml` (version PR + npm publish / OIDC)
- [ ] Remove the `changeset` job from `.github/workflows/ci.yml` (public-package changeset gate)
- [ ] Delete or gut `script/release.ts` and the root `release` script
- [ ] Drop any npm trusted-publishing / `NODE_AUTH_TOKEN` / OIDC docs outside `apps/docs`
- [ ] Review `script/tegami.mts` (npm notify) — remove if only used for publish announcements

---

## 3. Remove — Public-package root scripts & workspace publish wiring

Keep app functionality; remove the **publish pipeline**, not necessarily the library source (see § AI notes).

- [ ] Remove root scripts: `build:public`, `build:verified`
- [ ] Update `preflight` so it no longer runs public build/verify steps
- [ ] Remove `packages/public/*` from root `workspaces.packages` **only after** packages are moved or dependencies are rewired
- [ ] Clean `knip.json`, `.syncpackrc.json`, `turbo.json`, and related filters that target `packages/public/*` publish flows
  - Syncpack today has a version group for `@vyrel/morph` peer ranges — drop or retarget after move
- [ ] Remove `publint` / size / `build:verified` scripts that exist only for npm packages (if any remain after move)
- [ ] Update `.npmrc`: today `@vyrel:registry=…` and `access=public` — retarget scope or drop publish-oriented lines

---

## 4. Remove — Publish docs (markdown only; leave `apps/docs` alone)

Do **not** edit or delete anything under `apps/docs/`.

Outside that app, strip product/publish narrative:

- [ ] `README.md` — remove npm / `packages/public` publish sections and Release agent; rewrite as template intro
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
- [ ] Update Effect `Service` string ids that embed the scope (e.g. `@vyrel/api/models/.../Repository`)
- [ ] Update `docker-compose.yml` `name: vyrel`
- [ ] Update `.syncpackrc.json` package name lists (`vyrel`, `@vyrel/morph`, …)
- [ ] Reinstall / refresh lockfile after renames (`bun install`)

---

## 6. Rename — Expo (mobile) app

In `apps/mobile` (and related env / e2e / server deep links):

- [ ] `app.config.js`: `name`, `slug`, `scheme`
- [ ] iOS `bundleIdentifier`, Android `package`
- [ ] User-facing permission strings that say “Vyrel”
- [ ] Package name `vyrel-mobile` in `apps/mobile/package.json`
- [ ] `APP_SLUG` default / examples (`packages/env`, `.env.example`)
- [ ] Maestro e2e `APP_ID` values in scripts and flows
- [ ] Maestro deep links (`apps/mobile/.maestro/*.yaml` — `vyrel-mobile://…`)
- [ ] Server allowlist / CORS schemes that mention `vyrel-mobile://` (`apps/server/src/app.ts`)

Use placeholder-friendly IDs (e.g. `com.example.<template>`) unless the user supplies real ones.

---

## 7. Rename — Imports, scripts, and brand identifiers in code

After scope rename, fix remaining code references (focus on build-breaking and runtime brand strings):

- [ ] Source imports: `from "@vyrel/..."` → `from "@<new-scope>/..."`
- [ ] Codegen configs (`codegen.ts`, gql client scripts) that invoke `@vyrel/graphql-client`
- [ ] `transpilePackages` / Next config entries (`apps/web/next.config.ts`)
- [ ] Server / web / extension / mobile entrypoints and env helpers
- [ ] Logging helpers branded `createVyrel*` / `defineVyrelLogging` / `VyrelEnvLogLevel` in `@vyrel/logging` (+ call sites, `AGENTS.md`)
- [ ] HTTP / cookie brand strings (e.g. `x-vyrel-session-cookie`, `service: "vyrel-server"`)
- [ ] `script/entry-point.ts` banner text (`vyrel scripts`)
- [ ] Agent skills that hard-code `@vyrel/...` (especially `add-model-client`, `add-model-server`)
- [ ] MCP id mentions in skills (e.g. `project-0-vyrel-shadcn`) — Cursor derives this from the project folder/name; update skill text after rename or use the live MCP server id

---

## 8. Rename — Personal / repo identity

Replace author- and product-specific identity with template placeholders:

- [ ] GitHub URLs (`FlavioScimeca/vyrel`, homepage / bugs / repository fields on public packages)
- [ ] Bundle IDs / packages under `com.flavio-scimeca.*` / `com.flavio_scimeca.*`
- [ ] Example env values that embed `vyrel` (bucket names, DB URLs in **`.env.example` only** — never commit real `.env` secrets)
- [ ] Extension `package.json` description and similar product strings
- [ ] Root / marketing copy that assumes a shipped product named Vyrel

---

## 9. Rename — Docs and agent files (outside `apps/docs`)

- [ ] `AGENTS.md`, `CLAUDE.md`, `.cursorrules` — project name, `@scope`, structure tree (especially after moving `packages/public/*`), public-package publish commands
- [ ] `.agents/skills/**` and `.claude/skills/**` that describe Vyrel-specific publish or `@vyrel` scope
  - **Required:** `add-model-client` (`@vyrel/graphql-client`, `@vyrel/shared`, MCP id)
  - **Required:** `add-model-server` (`@vyrel/morph`, `@vyrel/db`, `@vyrel/logging`, Effect service ids)
- [ ] `.cursor/agents/agent-diagnostics.md` / `agent-preflight.md` — replace `@vyrel` filters and “vyrel monorepo” wording
- [ ] Root `README.md` / `CONTRIBUTING.md` titles and intro (template-oriented)
- [ ] `.agents/skills/README.md` — drop “Better Fullstack generated only” tone if skills are first-party

---

## AI handoff — branding name & open decisions

> **For the coding agent:** before bulk rename or deleting library code, continue the chat with the user and resolve the items below. Record answers at the top of this file or in the conversation, then proceed.

### Ask the user

1. **Template / monorepo name**
   - Human name (README, Expo display name)
   - npm/workspace scope (e.g. `@acme`, `@better-fullstack`)
   - Root `package.json` `"name"`
   - Suggested Expo `slug` / URL scheme
   - Preferred rename for `createVyrel*` logging APIs (e.g. `createAppElysiaPlugin` vs keep temporary alias)

2. **`packages/public` libraries (`morph`, `graphql-client`)**
   - **Recommended default:** stop publishing; **move** to private workspace packages (e.g. `packages/morph`, `packages/graphql-client`) and keep imports under the new scope.
   - Alternative: delete them and refactor consumers (large follow-up — only if the user explicitly wants it).
   - After move: update `add-model-*` skills and `AGENTS.md` structure tree.

3. **Optional later (do not block the checklist)**
   - Strip or keep sample domain (tasks, orgs) as template demo data
   - Replace logos / Expo icons with neutral placeholders
   - Whether to drop `apps/extension` from the template
   - Whether to later slim or rewrite `apps/docs` (out of scope until the user asks)
   - Clean unused deps called out in `AGENTS.md` (e.g. unused `ai` on server) as a separate hygiene pass

### Suggested conversation opener

Ask something like:

> What should the template be called (display name + `@scope`)? Confirm we **move** `morph` / `graphql-client` to private packages instead of deleting them. Any preferred Expo bundle ID prefix? Should `createVyrel*` logging helpers be renamed in the same pass?

Once answered, apply §§ 1–9 with that branding, then run a smoke path: `bun install`, `bun run check-types` (or package-local equivalents), and a quick web/server boot if the user requests it.

---

## Out of scope (for now)

- Editing or deleting `apps/docs`
- Redesigning the dashboard UI
- Publishing anything to npm
- Force-pushing or rewriting git history
- Rewriting `DEVELOPMENT_EXPERIENCE.md` into a full design doc (trim publish bits only unless asked)
