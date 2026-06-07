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

### 2026-06-07 — Split into Compare + Wishlist pages; Feature 1 code-complete
- **Did:** Fixed the IA — the one screen was the *searcher* but was labelled "Wishlist". Split into
  **`/compare`** (paste a URL **or** type a product name → two-phase compare + results) and
  **`/wishlist`** (the saved / price-tracked items as a full page). `/` redirects to `/compare`.
  Added a **name/keyword search** backend (`POST /api/wishlist/search`) so the searcher takes a URL
  or a name. Route-based sidebar nav, shared `AppFrame`. Cleaned up: dropped the combined
  `CompareScreen` + dead two-column/rail CSS, extracted `SavedEntryCard`. Linear: **WOR-129** (Done).
- **Files touched:** `app/page.tsx` (redirect), `app/compare/page.tsx`, `app/wishlist/page.tsx` (new),
  `components/wishlist/{AppFrame,CompareView,WishlistView}.tsx` (new) + `cards.tsx` (nav/SavedEntryCard),
  removed `CompareScreen.tsx`, `app/globals.css`, `lib/modules/wishlist/{service,index}.ts`,
  `app/api/wishlist/search/route.ts` (new), `CONVENTIONS.md` §4/§7, `AGENTS.md`.
- **Verified:** `pnpm typecheck` + `build` + `test` (19) green; both routes DOM-verified on the dev
  server (active nav, headers, empty states, the URL/name input).
- **Contract changes:** new `POST /api/wishlist/search { query } -> { item, listings, errors }`; new
  routes `/compare` + `/wishlist` (`/` redirects). Schema, other service interfaces, and tokens unchanged.
- **Open / risky:** **Feature 1 is code-complete but not yet *runnable* — it needs a live Postgres +
  Redis.** Every action (scrape, search, save, list) hits the DB; with none reachable the UI shows
  graceful empty/error states. This is the ONLY thing between here and "usable." Smaller: un-save
  (delete) is still visual-only; name-search creates a fresh catalog Item per query (minor dedupe gap).
- **Next task:** provision Postgres + Redis (`docker compose up -d`, or Neon + Upstash) and run
  `pnpm prisma migrate deploy` — then compare + save + wishlist work end-to-end. After that: wire
  un-save (`removeEntry`), responsive breakpoints, real product imagery.

---

### 2026-06-07 — Shop Wishlist UI (Graphite Pro) built + wired
- **Did:** Implemented the Claude-design **"Graphite Pro"** Shop Wishlist screen inside the app
  (the design handoff `Workshop buddy.zip`) and wired it to the real contract — no sample data
  shipped. Reconciled the accent from DeWalt yellow → the design's calm **green `#46B98A`**.
  Two-phase compare flow (scrape → refresh) with loading skeletons, best-deal = cheapest in-stock,
  miss cards from `errors[]`, and a saved-wishlist rail with price-change badges. Verified the
  populated screen renders correctly (dev-server screenshot) before reverting the temporary seed.
- **Files touched:** `app/globals.css` (Graphite Pro tokens + ported `.wb-*` component CSS),
  `app/layout.tsx` (next/font: Archivo + IBM Plex Mono), `app/page.tsx` (now the wishlist screen),
  `tailwind.config.ts` (token map), `components/wishlist/*` (`icons`, `view-model`, `cards`,
  `CompareScreen`), `CONVENTIONS.md` §7 + `AGENTS.md` design rule (synced to green), `.claude/launch.json`.
- **Verified:** `pnpm typecheck` + `build` + `test` (19) green; rendered the screen on the dev server
  and screenshot-checked the populated state (best-deal border/flag, out-of-stock can't win,
  confidence pips, price-delta badges, miss card) at 1480px.
- **Contract changes:** design tokens → **Graphite Pro green** (renamed `--wb-accent*` + new
  `--wb-app/chrome/surface/raised/hover` + `--wb-ink` scale + `--wb-green/red`). Schema, service
  interfaces, and API signatures **unchanged**. `app/page.tsx` is now Feature 1 (the wishlist).
- **Open / risky:** still **no live DB/Redis** here, so the screen shows empty/error states until
  Postgres+Redis are provisioned (compare, save, and the wishlist panel all need the DB). Un-save
  (delete) is visual-only for now — TODO: wire `removeEntry`. Per-retailer "streaming" is simulated
  (skeletons during the single-shot refresh; true SSE is a future enhancement). Layout is desktop-first
  (fixed 1440px frame) — responsive breakpoints are a follow-up. Other nav items (Projects/Inventory/…)
  are present but disabled (modules not built).
- **Next task:** provision Postgres + Redis (`docker compose up -d` or a cloud pair), run
  `pnpm prisma migrate deploy`, and exercise the compare + save flow end-to-end. Then: responsive
  breakpoints, wire un-save, and real product imagery.

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
