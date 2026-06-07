# Work Log — Workshop Buddy

Newest entry on top. At the end of each session, append one entry below so the next session (you,
later) can pick up with full context: what changed, what's open, and what's next. Solo project —
no turn-taking; this is continuity, not a handoff.

---

## Entry template — copy this block for every new entry

### YYYY-MM-DD — one-line summary
- **Did:** what you built or changed this session.
- **Files touched:** the key paths.
- **Verified:** typecheck / build / test status (leave `main` green).
- **Contract changes:** schema / service interface / API / design-token changes — or `none`.
- **Open / risky:** anything unfinished or uncertain.
- **Next task:** the single most important next step.

---

### 2026-06-07 — verified + hardened the backend, dark theme, pushed to GitHub
- **Did:** Ran the first real `pnpm install` and brought the gate to green; verified the
  hand-written `0_init` against `schema.prisma` offline (zero drift). Fixed a dual-ioredis
  typecheck break (BullMQ pins 5.10.1; added a pnpm override). Did a full code review and fixed:
  unauthenticated **SSRF** on the scrape path (new `lib/modules/pricing/ssrf.ts`), a money-parse
  bug (`$1,299` → `$1.30`), a **prod auth-bypass** via `DEV_USER_EMAIL`, `$0`-price listings winning
  "cheapest", cache-poisoning on blocked pages, fragile adapters (one bad card dropped a whole
  retailer), and a duplicate-listing race (added `@@unique([itemId, retailer])` + migration + upsert).
  Applied the **dark theme** (near-black + DeWalt yellow `#FFB81C`). Re-initialized git with the full
  6-commit history preserved and **pushed to GitHub `super-duper-dollop`**. Linear WOR-106..117 → Done.
- **Files touched:** `lib/core/{money,auth}.ts`, `lib/modules/pricing/{ssrf,scraper,fetcher,matcher,
  search}.ts` + `adapters/*`, `lib/modules/wishlist/service.ts`, `prisma/schema.prisma` + new
  migration `20260607000000_retailerlisting_unique_item_retailer`, `test/core/money.test.ts`,
  `app/globals.css`, `package.json`, `.gitattributes`.
- **Verified:** `pnpm typecheck` + `build` + `test` (19 passing) all green; migration offline-verified.
  CAVEAT: no local Postgres/Redis in this env (no Docker), so runtime paths (DB writes, live scraping,
  the SSRF DNS resolution) were not exercised against real services — only type/compile/unit-tested.
- **Contract changes:** design tokens → **dark theme**; schema **additive** `@@unique([itemId, retailer])`
  on `RetailerListing` (new migration). Service interfaces + API route signatures **unchanged**.
- **Open / risky:** UI not built — using an external **Claude-design file** (incoming, owner-provided);
  do not hand-author pages. Live DB/Redis still unprovisioned. The dark-theme hex values may be
  superseded by the design file.
- **Next task:** wire the incoming Claude-design wishlist UI to the `/api/wishlist` + `/api/items`
  contract (compare view two-phase load, retailer cards, price-change badges); provision Postgres +
  Redis and run `prisma migrate deploy` to exercise it end-to-end.

---

### 2026-06-07 — backend foundation authored
- **Did:** bootstrapped the app — Next.js 14 + TS, full Prisma schema (all domains) + first
  migration, core libs (db, redis/cache, events, money, auth, errors, http), the Pricing Engine
  (extraction waterfall, proxy fetcher, Amazon/Walmart/Best Buy adapters, centralized matcher,
  parallel search, BullMQ worker), the catalog backbone, the Wishlist module + API routes, design
  tokens, CONVENTIONS.md, and unit tests (matcher + extraction merge).
- **Files touched:** `prisma/**`, `lib/**`, `app/**`, `test/**`, config + docs.
- **Verified:** authored offline (no DB/registry available at write time) — run
  `pnpm install && pnpm typecheck && pnpm build && pnpm test` to confirm green; hand-written
  `prisma/migrations/0_init` should be checked against `schema.prisma` (`prisma migrate diff`).
- **Contract changes:** initial — schema, `lib/modules/*/index.ts`, API signatures (see
  CONVENTIONS.md), and design tokens are now established.
- **Open / risky:** verification gate not yet run at authoring time; design tokens are the original
  cream/charcoal scheme — a dark theme is being explored and may replace them.
- **Next task:** run the verify gate and reconcile any reds, then build the Shop Wishlist UI
  (compare view with two-phase load, retailer cards, wishlist view with price-change badges)
  against `/api/wishlist` and `/api/items`.
