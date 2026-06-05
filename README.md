# Workshop Buddy

A shop assistant for makers — track and plan everything in the workshop. Modular-monolith
Next.js 14 app. **Feature 1 (Shop Wishlist)** ships now: paste a product URL, scrape it into a
canonical `Item`, and compare live prices across retailers. The schema anticipates projects,
inventory, tools, gaps, expenses, and cost-to-complete.

> Two-agent build: **Claude** owns the backend/contract (schema, services, APIs, design tokens);
> **Codex** builds feature UIs against the contract. See `AGENTS.md`, `CLAUDE.md`, `CONVENTIONS.md`.

## Stack
Next.js 14 (App Router) · TypeScript · Prisma + PostgreSQL · Redis (Upstash/ioredis) · BullMQ ·
NextAuth · Playwright + Cheerio · Tailwind.

## Getting started
```bash
pnpm install
cp .env.example .env          # fill in values
docker compose up -d          # local Postgres + Redis
pnpm prisma migrate deploy    # apply the committed migration (or: pnpm prisma migrate dev)
pnpm dev                      # http://localhost:3000
pnpm worker                   # (optional) background scrape/search worker
```

## Verify
```bash
pnpm typecheck && pnpm build && pnpm test
```

## Layout
- `prisma/` — full schema (all domains) + first migration
- `lib/core/` — db, redis/cache, event bus, money, auth, errors, http helpers
- `lib/modules/pricing/` — scraper waterfall + cross-retailer search (reusable service)
- `lib/modules/catalog/` — the shared `Item` backbone (upsert/dedupe)
- `lib/modules/wishlist/` — Feature 1 service + the API behind `app/api/wishlist` & `app/api/items`
- `lib/modules/{inventory,projects,expenses,insights}/` — scaffolded for later milestones
- `app/api/**` — thin route handlers
- `test/` — unit tests (matcher, extraction waterfall)

The Pricing Engine runs without paid services: if no `SCRAPER_PROVIDER` key is set it falls back
to a direct fetch (logged TODO). Set ScraperAPI/Bright Data creds for production.
