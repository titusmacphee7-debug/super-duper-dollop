# CLAUDE.md

@AGENTS.md

## Claude-only notes
You own the **entire** Workshop Buddy codebase — architecture, backend, frontend, and design
tokens. Everything in AGENTS.md applies; these are the points to keep front of mind:

- **You define and evolve the contract** — schema, service interfaces (`lib/modules/*/index.ts`),
  API route signatures, and design tokens. Keep them stable on purpose; when you change one, note
  it in a `HANDOFF.md` entry so future sessions have the history.
- **Keep `CONVENTIONS.md` authoritative and current.** It's the architecture reference you build
  against — if it's stale, the codebase drifts.
- **You own migrations** (`pnpm prisma migrate dev`). Prefer **additive** migrations — other
  modules already reference the core tables.
- **Stay modular.** New features are new modules under `lib/modules/*` with their own service
  interface; reach across modules only through those interfaces, and decouple reactions through the
  event bus (`lib/core/events`).
- **End every session green:** `pnpm typecheck && pnpm build && pnpm test`, commit, merge to
  `main`, and append a `HANDOFF.md` work-log entry.
