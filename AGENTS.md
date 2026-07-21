# vyrel

This file provides context about the project for AI assistants.

## Project Overview

- **Ecosystem**: Typescript

## Tech Stack

- **Runtime**: bun
- **Package Manager**: bun

### Frontend

- Framework: next
- CSS: tailwind
- UI Library: shadcn-ui
- State: zustand

### Backend

- Framework: elysia
- API: graphql-yoga
- Validation: zod

### Database

- Database: sqlite
- ORM: drizzle

### Authentication

- Provider: better-auth-organizations

### Additional Features

- Testing: vitest-playwright
- AI: vercel-ai
- Email: resend
- Job Queue: bullmq
- Logging: evlog via `@vyrel/logging`

## Project Structure

```
vyrel/
├── apps/
│   ├── web/         # Frontend application
│   ├── server/      # Backend API
│   ├── docs/        # Documentation site
│   └── extension/   # Browser extension
├── packages/
│   ├── api/         # API layer (domain resolvers, auth context)
│   ├── auth/        # Authentication
│   ├── bun-porting/ # Bun API porting for Vercel (e.g. BunImage via standalone worker)
│   ├── db/          # Database schema
│   ├── graphql/     # GraphQL infrastructure (Pothos, Yoga)
│   ├── logging/     # Shared evlog facade (`@vyrel/logging`)
│   └── public/
│       ├── graphql-client/ # Apollo optimistic CRUD and schema metadata codegen
│       └── morph/          # Drizzle/Zod/Pothos model bridge
```

## Logging

- **Single entry point**: import only from `@vyrel/logging` (and subpaths). Do not import `evlog` or `@logtape/*` directly outside `packages/logging`.
- **Apps**: call `initLogging()` at process boot (server `index.ts`, Next `instrumentation.ts`).
- **Elysia**: use `createVyrelElysiaPlugin()` from `@vyrel/logging/elysia`.
- **Next.js**: use `createVyrelNextInstrumentation()` / `createVyrelNextLogging()` from `@vyrel/logging/next`.
- **Drizzle**: use `createDrizzleLogger()` from `@vyrel/logging/drizzle`.
- **Scripts**: call `initScriptLogging({ script })` from `@vyrel/logging/script`, or `runScript(name, program)` from `script/runtime.ts`. Prefer `log.info/warn/error` over `Effect.log` / `console.*`.

## Common Commands

- `bun install` - Install dependencies
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun test` - Run tests
- `bun db:push` - Push database schema
- `bun db:studio` - Open database UI
- `bun graphql:schema` - Generate GraphQL SDL for the web app
- `bun run --cwd apps/web gql:client` - Run GraphQL Codegen for the gql.tada fragment, canonical CRUD and schema registries
- `bun run --cwd apps/web gql:client:watch` - Regenerate the GraphQL client registry as documents change
- `bun run --cwd packages/public/graphql-client validate` - Validate GraphQL client types, lint, exports and tests
- `bun run --cwd packages/public/graphql-client size` - Report GraphQL client bundle and publish sizes

## Maintenance

Keep AGENTS.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.

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
