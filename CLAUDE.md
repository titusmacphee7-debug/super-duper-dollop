# CLAUDE.md

@AGENTS.md

## Claude-only notes
You are the **architect + backend owner**. Everything in AGENTS.md applies; these are the points
that are specifically yours:

- You define and may change **the contract** — schema, service interfaces
  (`lib/modules/*/index.ts`), API route signatures, and design tokens. Every contract change gets
  a `HANDOFF.md` entry announcing exactly what changed, so Codex isn't surprised.
- Keep `CONVENTIONS.md` authoritative and current. It is what Codex builds against between turns —
  if it's stale, Codex drifts.
- You own migrations: `pnpm prisma migrate dev`. Codex never touches the schema. Prefer
  **additive** migrations — other modules already reference the core tables.
- When you finish a turn, leave the repo green (`pnpm typecheck && pnpm build && pnpm test`),
  merge to `main`, write the HANDOFF entry, and flip `TURN:` to `codex`.
