# AGENTS.md — Workshop Buddy

Operating manual for every AI agent in this repo. Codex reads this file natively; Claude Code
reads it through the `@AGENTS.md` import in `CLAUDE.md`. Load it fully at the start of every
session before doing anything.

## What this project is
Workshop Buddy — a modular-monolith Next.js workshop-management app. Feature 1 is the Shop
Wishlist; the architecture anticipates projects, inventory, expenses, tool-gaps, and
cost-to-complete. Deep architecture and patterns live in `CONVENTIONS.md` — read that too before
any backend work.

## Two agents, one repo, strict turns
This repo is worked by two agents that **never run at the same time**:
- **Claude (Opus 4.8)** — architect + backend. Owns the contract.
- **Codex** — frontend + feature build-out. Builds against the contract.

The only conflicts possible in a turn-based setup are *drift* (not knowing what the other did)
and a *dirty repo*. The protocol below removes both.

## Turn protocol — do this EVERY session
1. **Check the baton.** Open `HANDOFF.md`. The top line reads `TURN: claude` or `TURN: codex`.
   If it isn't your turn, stop — the other agent hasn't handed off yet.
2. **Sync.** `git switch main && git pull`. Never start on top of uncommitted work.
3. **Catch up.** Read the newest `HANDOFF.md` entry: what changed, what's open, your next task.
4. **Work — but stay in your lane** (see Ownership).
5. **Verify before committing:** `pnpm install && pnpm typecheck && pnpm build && pnpm test`.
   All green, or you do not hand off.
6. **Commit** on a session branch `claude/<topic>` or `codex/<topic>`, with a labeled message
   `[claude] …` / `[codex] …`, then merge to `main` (build still green).
7. **Hand off.** Append a `HANDOFF.md` entry (template lives in that file) and flip the `TURN:`
   line to the other agent. Push.

The invariant: **everything is committed and merged to `main` at the end of every turn.** Because
the agents are sequential, that one rule guarantees the next agent always starts from a clean,
coherent state. That is what prevents conflicts — not luck, not locking.

## Ownership — who edits what
Stay in your lane. If you need something in the other lane, request it in `HANDOFF.md`; do not
reach across and edit it yourself.

| Path | Owner | Other agent |
|------|-------|-------------|
| `prisma/`, `lib/core/**`, `lib/modules/*/service*`, `lib/modules/*/api*` | Claude | read only |
| `app/api/**` (route handlers) | Claude | read only |
| `lib/modules/*/index.ts` (public service interfaces) | Claude defines | Codex imports, never edits |
| `app/**` (pages), `components/**`, client state, styles | Codex | read only |
| `CONVENTIONS.md`, design tokens, schema | Claude | read only |
| `AGENTS.md`, `CLAUDE.md` | Claude (carefully) | propose changes via HANDOFF |
| `HANDOFF.md` | both (append-only) | — |

## The contract — do not drift
The **schema**, the **service interfaces** (`lib/modules/*/index.ts`), the **API route
signatures**, and the **design tokens** are THE CONTRACT.
- Only Claude changes the contract, and only with a `HANDOFF.md` entry announcing exactly what
  changed.
- Codex codes against the contract. If something is missing, log it under “Requests for Claude”
  in `HANDOFF.md`. Do **not** invent a fake backend or loosen a service signature to make the UI
  compile.
- **TypeScript is the enforcer.** Types flow across the boundary, so a contract mismatch fails
  `pnpm typecheck`. A red typecheck is a contract violation to fix at the source — never something
  to silence with `any`.

## Commands
- install: `pnpm install`  ·  dev: `pnpm dev`  ·  typecheck: `pnpm typecheck`
- build: `pnpm build`  ·  test: `pnpm test`
- migrate: `pnpm prisma migrate dev`  *(Claude only — schema is the contract)*

## House rules
- pnpm only — never npm or yarn.
- No default exports in shared modules.
- Money goes through `lib/core/money`; never do raw float math on prices in the UI.
- Design: yellow (`--wb-yellow`) is an accent only — CTAs, active nav, key highlights. Cream
  canvas (`--wb-bg`), charcoal ink. Never white/light text on yellow. Full rules in
  `CONVENTIONS.md`.

## If Codex runs in the cloud (PR mode)
If a Codex turn runs as a Codex Cloud task that opens a pull request, the merge in step 6 becomes
“review and merge the Codex PR into `main`” before Claude’s next turn starts. Same invariant:
`main` is clean and current at the start of every turn.
