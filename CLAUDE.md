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
- Logging: evlog

## Project Structure

```
vyrel/
├── apps/
│   ├── web/         # Frontend application
│   └── server/      # Backend API
├── packages/
│   ├── api/         # API layer (domain resolvers, auth context)
│   ├── auth/        # Authentication
│   ├── bun-porting/ # Bun API porting for Vercel (e.g. BunImage via standalone worker)
│   ├── db/          # Database schema
│   └── graphql/     # GraphQL infrastructure (Pothos, Yoga)
```

## Common Commands

- `bun install` - Install dependencies
- `bun dev` - Start development server
- `bun build` - Build for production
- `bun test` - Run tests
- `bun db:push` - Push database schema
- `bun db:studio` - Open database UI
- `bun graphql:schema` - Generate GraphQL SDL for the web app

## Maintenance

Keep CLAUDE.md updated when:

- Adding/removing dependencies
- Changing project structure
- Adding new features or services
- Modifying build/dev workflows

AI assistants should suggest updates to this file when they notice relevant changes.
