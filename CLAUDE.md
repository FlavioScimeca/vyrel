@AGENTS.md

# vyrel

Claude-specific entry: **prefer [`AGENTS.md`](./AGENTS.md)** as the source of
truth for stack, structure, logging, commands, and Ultracite rules.

When the monorepo structure or workflows change, update `AGENTS.md` (this file
only points there to avoid drift).

For new domain models:

- Server → `.agents/skills/add-model-server/SKILL.md`
- Web client → `.agents/skills/add-model-client/SKILL.md`