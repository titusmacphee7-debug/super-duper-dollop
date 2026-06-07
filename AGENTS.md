# AGENTS.md — Workshop Buddy

Operating manual for any AI agent (and you) working in this repo. Claude Code reads it through
the `@AGENTS.md` import in `CLAUDE.md`. Load it fully at the start of every session before doing
anything.

## What this project is
Workshop Buddy — a modular-monolith Next.js workshop-management app for makers. Feature 1 is the
Shop Wishlist (paste a product URL → scrape it → compare live prices across retailers). The
architecture anticipates projects, inventory, tools, tool-gaps, expenses, and cost-to-complete.
Deep architecture and patterns live in `CONVENTIONS.md` — read that too before any code work.

## How it's built
**Single developer + Claude Code, end to end.** One person owns the whole codebase — schema,
backend services, API routes, frontend UI, and design tokens. There is no second agent and no
handoff: the discipline below exists so the project stays coherent across sessions and as new
features land, not to coordinate multiple people.

## Per-session protocol
1. **Sync.** `git switch main && git pull` (or your branch). Never start on top of uncommitted work.
2. **Catch up.** Read the newest entry in `HANDOFF.md` (the work log): what changed last, what's
   open, what's next.
3. **Work** against the architecture in `CONVENTIONS.md`. Keep modules decoupled.
4. **Verify before committing:** `pnpm install && pnpm typecheck && pnpm build && pnpm test`.
   Leave `main` green.
5. **Commit** in logical chunks with clear messages, then merge to `main` (build still green).
6. **Log.** Append a `HANDOFF.md` entry (template in that file): what you did, files touched,
   verification status, any contract/schema change, what's open, and the next task.

The invariant: **everything is committed and `main` is green at the end of every session.** That's
what lets the next session start from a clean, coherent state.

## Architecture principles (the "contract")
The **schema**, the module **service interfaces** (`lib/modules/*/index.ts`), the **API route
signatures**, and the **design tokens** are the stable core. Treat them as a contract you keep
stable on purpose:
- Change them deliberately, and record the change in a `HANDOFF.md` entry so future sessions aren't
  surprised.
- Cross-module access goes through service interfaces — never a direct DB read into another module's
  tables. Keeps modules swappable and the dependency graph legible.
- **TypeScript is the enforcer.** Types flow across module boundaries, so a mismatch fails
  `pnpm typecheck`. A red typecheck is a real problem to fix at the source — never silence it with
  `any`.

## Commands
- install: `pnpm install`  ·  dev: `pnpm dev`  ·  typecheck: `pnpm typecheck`
- build: `pnpm build`  ·  test: `pnpm test`
- migrate: `pnpm prisma migrate dev`  ·  worker: `pnpm worker`

## House rules
- pnpm only — never npm or yarn.
- No default exports in shared modules (`lib/**`). Named exports only.
- Money goes through `lib/core/money`; never raw float math on prices in the UI.
- Migrations are **additive** — the core tables are referenced everywhere; don't rewrite them.
- Design: yellow (`--wb-yellow`) is an accent only — CTAs, active nav, key highlights. Never
  white/light text on yellow, never a large yellow fill. Full rules in `CONVENTIONS.md`.
