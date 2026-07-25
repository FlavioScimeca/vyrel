@AGENTS.md

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
│   ├── mobile/      # Expo React Native app (HeroUI Native)
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
└── shared/          # App-only shared utilities (`@vyrel/shared`)
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

<!-- HEROUI-NATIVE-AGENTS-MD-START -->
[HeroUI Native Docs Index]|root: ./.heroui-docs/native|STOP. What you remember about HeroUI Native is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: heroui agents-md --native --output AGENTS.md|components/(buttons):{button.mdx,close-button.mdx,link-button.mdx}|components/(collections):{menu.mdx,tag-group.mdx}|components/(controls):{slider.mdx,switch.mdx}|components/(data-display):{chip.mdx}|components/(feedback):{alert.mdx,skeleton-group.mdx,skeleton.mdx,spinner.mdx}|components/(forms):{checkbox.mdx,control-field.mdx,description.mdx,field-error.mdx,input-group.mdx,input-otp.mdx,input.mdx,label.mdx,radio-group.mdx,search-field.mdx,select.mdx,text-area.mdx,text-field.mdx}|components/(layout):{card.mdx,separator.mdx,surface.mdx}|components/(media):{avatar.mdx}|components/(navigation):{accordion.mdx,list-group.mdx,tabs.mdx}|components/(overlays):{bottom-sheet.mdx,dialog.mdx,popover.mdx,toast.mdx}|components/(typography):{text.mdx}|components/(utilities):{pressable-feedback.mdx,scroll-shadow.mdx}|getting-started/(handbook):{animation.mdx,colors.mdx,composition.mdx,portal.mdx,provider.mdx,styling.mdx,theming.mdx}|getting-started/(overview):{design-principles.mdx,quick-start.mdx}|getting-started/(ui-for-agents):{agent-skills.mdx,agents-md.mdx,llms-txt.mdx,mcp-server.mdx}|releases:{beta-10.mdx,beta-11.mdx,beta-12.mdx,beta-13.mdx,cli-v1-0-0.mdx,rc-1.mdx,rc-2.mdx,rc-3.mdx,rc-4.mdx,v1-0-0.mdx,v1-0-1.mdx,v1-0-2.mdx,v1-0-3.mdx,v1-0-4.mdx,v1-0-5.mdx}
<!-- HEROUI-NATIVE-AGENTS-MD-END -->
