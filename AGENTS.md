# vyrel

Context for AI assistants working in this monorepo. Keep this file aligned with the
real tree and workflows — prefer updating here over inventing stack details.

## Project overview

- **Ecosystem**: TypeScript monorepo (Bun workspaces + Turborepo)
- **Product apps**: Next.js web, Expo mobile, Elysia API, Fumadocs docs, browser extension
- **Domain models today**: `user`, `organization`, `task` (+ health GraphQL)

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime / PM | Bun |
| Web | Next.js (App Router), Tailwind v4, shadcn UI via `@vyrel/shared` |
| Mobile | Expo ~57, Expo Router, HeroUI Native (Uniwind) |
| API server | Elysia |
| GraphQL | graphql-yoga, Pothos, `@vyrel/morph` (Zod → Pothos), gql.tada, Apollo Client, `@vyrel/graphql-client` |
| Validation | Zod |
| Server domain | Effect (repositories, services, runners) |
| Database | SQLite / libSQL + Drizzle |
| Auth | better-auth (+ organizations; `@better-auth/expo` on mobile) |
| Env | `@vyrel/env` (t3-env + Zod per surface: server / web / native / extension) |
| Logging | evlog via `@vyrel/logging` only |
| Email | Resend (auth / mail paths) |
| Jobs | BullMQ (server queue/workers) |
| Lint / format | Ultracite (Biome) |
| Tests | Vitest (+ Playwright where configured); mobile Jest + Maestro e2e |

**Client state:** prefer React state, feature `context/`, Apollo cache, and
`authClient`. Do **not** introduce Zustand unless the user asks.

**AI SDK:** `ai` may appear in `apps/server` dependencies; do not assume active
domain usage — check call sites before building on it.

## Project structure

```
vyrel/
├── apps/
│   ├── web/          # Next.js App Router + Apollo / gql.tada
│   ├── mobile/       # Expo Router + HeroUI Native
│   ├── server/       # Elysia HTTP + GraphQL Yoga
│   ├── docs/         # Fumadocs documentation site
│   └── extension/    # Browser extension
├── packages/
│   ├── api/          # Domain models (Effect + GraphQL + optional REST)
│   ├── auth/         # better-auth server wiring
│   ├── bun-porting/  # Bun API porting (e.g. image worker for Vercel)
│   ├── config/       # Shared TSConfig base
│   ├── consts/       # Cross-app constants (server / web / native)
│   ├── db/           # Drizzle schema + relations
│   ├── env/          # Typed env per app surface
│   ├── graphql/      # Pothos builder, Yoga, Effect GraphQL helpers
│   ├── logging/      # Shared evlog facade (`@vyrel/logging`)
│   ├── storage/      # Object-storage helpers (Effect)
│   └── public/
│       ├── graphql-client/  # Optimistic Apollo CRUD + codegen plugin (npm)
│       └── morph/           # Zod → Pothos bridge (npm)
├── shared/           # Web UI primitives (`@vyrel/shared`) — shadcn lives here
├── script/           # Repo scripts (commit, release, rover, …)
└── .agents/skills/   # Project agent skills (add-model-*, ultracite, …)
```

Workspace package names use the `@vyrel/*` scope (root package name: `vyrel`).

## Domain / feature conventions

When adding a **server model**, follow `.agents/skills/add-model-server/SKILL.md`
(Drizzle → Effect repo/services → Zod base/extra → Morph/Pothos GraphQL).

When adding a **web client feature**, follow `.agents/skills/add-model-client/SKILL.md`
(thin App Router pages, feature folders, gql.tada documents, optimistic hooks).

Do **not** run `db:push`, migrations, `graphql:schema`, or `gql:client` as part
of those skills unless the user explicitly asks — write files, then list commands.

## Logging

- **Single entry point**: import only from `@vyrel/logging` (and subpaths). Do not import `evlog` or `@logtape/*` outside `packages/logging`.
- **Apps**: call `initLogging()` at process boot (server `index.ts`, Next `instrumentation.ts`).
- **Elysia**: `createVyrelElysiaPlugin()` from `@vyrel/logging/elysia`.
- **Next.js**: `createVyrelNextInstrumentation()` / `createVyrelNextLogging()` from `@vyrel/logging/next`.
- **Drizzle**: `createDrizzleLogger()` from `@vyrel/logging/drizzle`.
- **Scripts**: `initScriptLogging({ script })` from `@vyrel/logging/script`, or `runScript(name, program)` from `script/runtime.ts`. Prefer `log.info/warn/error` over `Effect.log` / `console.*`.

## Common commands

```bash
bun install
bun run dev                 # turbo dev (web + server, …)
bun run build
bun run test
bun run db:push
bun run db:studio
bun run graphql:schema      # GraphQL import discovery + SDL

# Web GraphQL client
bun run --cwd apps/web gql:generate
bun run --cwd apps/web gql:client
bun run --cwd apps/web gql:client:watch

# Mobile
bun run --cwd apps/mobile start
bun run --cwd apps/mobile gql:generate
bun run --cwd apps/mobile gql:client
bun run --cwd apps/mobile test
bun run --cwd apps/mobile test:e2e:ios
bun run --cwd apps/mobile test:e2e:android

# Public packages (publish pipeline)
bun run --cwd packages/public/graphql-client validate
bun run --cwd packages/public/graphql-client size
bun run build:public
bun run preflight           # local quality gate (also husky pre-push)
```

## Maintenance

Update this file when:

- Adding/removing apps or packages
- Changing stack choices or default client-state approach
- Adding or renaming agent skills / workflows
- Changing codegen or quality-gate commands

<!-- HEROUI-NATIVE-AGENTS-MD-START -->
[HeroUI Native Docs Index]|root: ./.heroui-docs/native|STOP. What you remember about HeroUI Native is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: heroui agents-md --native --output AGENTS.md|components/(buttons):{button.mdx,close-button.mdx,link-button.mdx}|components/(collections):{menu.mdx,tag-group.mdx}|components/(controls):{slider.mdx,switch.mdx}|components/(data-display):{chip.mdx}|components/(feedback):{alert.mdx,skeleton-group.mdx,skeleton.mdx,spinner.mdx}|components/(forms):{checkbox.mdx,control-field.mdx,description.mdx,field-error.mdx,input-group.mdx,input-otp.mdx,input.mdx,label.mdx,radio-group.mdx,search-field.mdx,select.mdx,text-area.mdx,text-field.mdx}|components/(layout):{card.mdx,separator.mdx,surface.mdx}|components/(media):{avatar.mdx}|components/(navigation):{accordion.mdx,list-group.mdx,tabs.mdx}|components/(overlays):{bottom-sheet.mdx,dialog.mdx,popover.mdx,toast.mdx}|components/(typography):{text.mdx}|components/(utilities):{pressable-feedback.mdx,scroll-shadow.mdx}|getting-started/(handbook):{animation.mdx,colors.mdx,composition.mdx,portal.mdx,provider.mdx,styling.mdx,theming.mdx}|getting-started/(overview):{design-principles.mdx,quick-start.mdx}|getting-started/(ui-for-agents):{agent-skills.mdx,agents-md.mdx,llms-txt.mdx,mcp-server.mdx}|releases:{beta-10.mdx,beta-11.mdx,beta-12.mdx,beta-13.mdx,cli-v1-0-0.mdx,rc-1.mdx,rc-2.mdx,rc-3.mdx,rc-4.mdx,v1-0-0.mdx,v1-0-1.mdx,v1-0-2.mdx,v1-0-3.mdx,v1-0-4.mdx,v1-0-5.mdx}
<!-- HEROUI-NATIVE-AGENTS-MD-END -->

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

**Expo**

- Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
  For HeroUI Native, search `.heroui-docs/native` / MCP — do not rely on memorized APIs.

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
