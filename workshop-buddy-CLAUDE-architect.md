# Workshop Buddy — Architecture & Backend Brief
### For Claude Opus 4.8 (run this first)

## Your Role

You are the **architect and backend engineer** for Workshop Buddy, a personal workshop-management
web app. You own the decisions that are expensive to change later: the data model, the module
architecture, the core backend services, and the project framework.

A second agent — **OpenAI Codex** — will build the feature UIs and high-volume frontend code on
top of the foundation you lay down. A large part of your job is therefore leaving clean,
documented extension points and writing a `CONVENTIONS.md` that Codex (and future sessions) will
treat as law.

**Optimize for extensibility over completeness.** Only the first feature (Shop Wishlist) ships
now, but the schema and module boundaries must anticipate the full scope below, so that adding a
feature is "write a module," never "refactor the foundation."

---

## The Full Vision (design for all of this; build only Feature 1 now)

Workshop Buddy is a shop assistant for a maker — a buddy that helps track and plan everything in
the workshop:

- **Projects** — what I'm working on, what's done, what's blocked; budgets and timelines.
- **Tasks** — what I have to do and what I'm doing right now.
- **Inventory & Storage** — what I own, how much, and where it physically lives (nested locations:
  garage → shelf B → bin 3).
- **Tools & Equipment** — what I have, its condition and location.
- **Tool / Equipment Gaps** — what a project needs that I don't own (derived, not entered).
- **Shop Wishlist** *(Feature 1)* — things to acquire, with live price comparison across retailers.
- **Expenses** — what I've spent, tied to projects and purchases.
- **Cost-to-Complete** — how much finishing a project will actually cost (derived from gaps × live
  retailer prices).

The thing that makes this a *buddy* and not eight disconnected CRUD screens is the
**interconnection**:

> a project declares what it needs → inventory says what I have → the gap is what's missing → the
> wishlist finds the best price to fill the gap → buying it logs an expense and updates inventory →
> cost-to-complete is gaps × live prices.

Design the data model so these joins are first-class from day one, even though only the wishlist
is wired up now.

---

## Architectural Mandate

- **Modular monolith.** One Next.js app, organized into self-contained domain modules. No
  microservices.
- **One module per domain**, each owning its schema models, a service layer (business logic), and
  its API route handlers — exposed through a clear public service interface.
- **Cross-module access goes through service interfaces, never direct DB reads into another
  module's tables.** This keeps modules swappable and the dependency graph legible.
- **A shared `Item` catalog is the backbone.** Every domain references canonical Items; product
  data is never duplicated. The wishlist's scraper populates the catalog; inventory, requirements,
  and expenses all point at the same Items.
- **The Pricing Engine** (web scraper + cross-retailer search) is a standalone backend service.
  The wishlist uses it now; cost-to-complete will use it later. Build it as a reusable service, not
  wishlist-internal code.
- **Schema-first for the whole domain; services for Feature 1 only.** Define the join entities for
  every domain now so they exist and relate correctly, but implement services + APIs only for the
  wishlist. Unused models are fine; schema churn later is not.
- **Establish a lightweight domain-event pattern** (a small event bus or hook system) so reactions
  like "purchase logged → inventory incremented → wishlist entry marked acquired" are decoupled.
  Stub the listeners you don't need yet.
- **Write `CONVENTIONS.md`** documenting the module layout, naming, the service-interface pattern,
  API conventions, error handling, and a step-by-step "how to add a new module" checklist. This is
  the contract Codex builds against.

---

## Suggested Module Layout (refine as you see fit, then document the final version)

```
/lib/modules
  /pricing      — scraper + cross-retailer search (shared service)
  /catalog      — Item: canonical product / tool / material registry
  /inventory    — InventoryRecord, Location (nested storage)
  /projects     — Project, Task, Requirement
  /wishlist     — Wishlist, WishlistEntry, RetailerListing  (Feature 1)
  /expenses     — Expense
  /insights     — derived reads: tool gaps, cost-to-complete (reads via services)
/lib/core
  /db           — Prisma singleton
  /redis        — Upstash client + cache helpers
  /events       — domain event bus
  /money        — currency parsing / formatting
  /auth         — NextAuth config
```

Each module exposes a single public surface (e.g. `lib/modules/wishlist/index.ts`) so other
modules import the service, never the internals.

---

## Core Data Model (define ALL of this — it spans every domain)

Implement migrations for the whole schema now. Only the wishlist models get services + APIs this
session; the rest exist so the joins are correct from the start.

```prisma
// ---------- Core / shared ----------
model User {
  id        String            @id @default(cuid())
  email     String            @unique
  name      String?
  projects  Project[]
  wishlists Wishlist[]
  locations Location[]
  expenses  Expense[]
  inventory InventoryRecord[]
}

// The canonical "thing" — a specific product, tool, or material.
// Populated by the pricing engine; referenced by every other domain. The backbone.
model Item {
  id           String            @id @default(cuid())
  name         String
  brand        String?
  modelNumber  String?
  upc          String?
  category     String?           // 'tool' | 'material' | 'consumable' | 'other'
  imageUrl     String?
  sourceUrl    String?
  createdAt    DateTime          @default(now())
  listings     RetailerListing[]
  inventory    InventoryRecord[]
  requirements Requirement[]
  wishlistIn   WishlistEntry[]
  expenses     Expense[]
  @@index([modelNumber])
  @@index([upc])
}

// ---------- Pricing / Wishlist (Feature 1 — IMPLEMENTED) ----------
model RetailerListing {
  id            String   @id @default(cuid())
  itemId        String
  item          Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  retailer      String
  url           String
  price         Float
  originalPrice Float?
  currency      String   @default("USD")
  inStock       Boolean  @default(true)
  shipping      String?
  condition     String?  // 'new' | 'renewed' | 'used' | 'open-box'
  priceHistory  Float[]  @default([])
  matchScore    Float?   // confidence this listing == the item
  updatedAt     DateTime @updatedAt
  @@index([itemId])
}

model Wishlist {
  id        String          @id @default(cuid())
  name      String
  userId    String
  user      User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries   WishlistEntry[]
  createdAt DateTime        @default(now())
}

model WishlistEntry {
  id                  String   @id @default(cuid())
  wishlistId          String
  wishlist            Wishlist @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  itemId              String
  item                Item     @relation(fields: [itemId], references: [id])
  preferredRetailerId String?  // RetailerListing.id
  priceAtSave         Float?   // powers the price-change badge later
  note                String?
  acquired            Boolean  @default(false) // flipped when purchased
  requirementId       String?  // links a gap to its acquisition (future)
  addedAt             DateTime @default(now())
}

// ---------- Storage / Inventory (SCAFFOLDED) ----------
model Location {
  id       String            @id @default(cuid())
  userId   String
  user     User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  name     String
  parentId String?           // nesting: garage > shelf B > bin 3
  parent   Location?         @relation("LocationTree", fields: [parentId], references: [id])
  children Location[]        @relation("LocationTree")
  records  InventoryRecord[]
}

model InventoryRecord {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId     String
  item       Item      @relation(fields: [itemId], references: [id])
  locationId String?
  location   Location? @relation(fields: [locationId], references: [id])
  quantity   Float     @default(1)
  condition  String?
  notes      String?
  @@index([itemId])
}

// ---------- Projects / Tasks / Requirements (SCAFFOLDED) ----------
model Project {
  id           String        @id @default(cuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  status       String        @default("planning") // planning|active|blocked|done
  budget       Float?
  startDate    DateTime?
  dueDate      DateTime?
  tasks        Task[]
  requirements Requirement[]
  expenses     Expense[]
  createdAt    DateTime      @default(now())
}

model Task {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title     String
  status    String   @default("todo") // todo|doing|done
  priority  Int      @default(0)
  createdAt DateTime @default(now())
}

// What a project needs — the basis for gap analysis + cost-to-complete.
model Requirement {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  itemId    String
  item      Item    @relation(fields: [itemId], references: [id])
  quantity  Float   @default(1)
  // gap = quantity − owned(itemId); cost-to-complete = gap × cheapest in-stock listing
}

// ---------- Expenses (SCAFFOLDED) ----------
model Expense {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  itemId    String?
  item      Item?    @relation(fields: [itemId], references: [id])
  projectId String?
  project   Project? @relation(fields: [projectId], references: [id])
  amount    Float
  currency  String   @default("USD")
  retailer  String?
  note      String?
  spentAt   DateTime @default(now())
}
```

When you add a future domain's services, prefer **additive** migrations — never rewrite these
core tables, since other modules already reference them.

---

## Feature 1 — Shop Wishlist (build the backend in full)

Flow: user pastes a product URL → scrape it into an `Item` → search other retailers for the same
Item → store `RetailerListing`s → user saves a `WishlistEntry` with a preferred retailer.

### Part A — The Pricing Engine (`lib/modules/pricing`, build as a reusable service)

This is shared infrastructure: the wishlist calls it now, cost-to-complete calls it later. It has
two halves — a scraper and a cross-retailer search.

**Scraper — extraction waterfall.** Structure it as an orchestrator + retailer adapters + one
shared fetcher (the only code that touches the network, so swapping proxy providers is one line).
Extract structured data before CSS selectors, because page layouts change constantly but
schema.org / Open Graph data rarely does:

1. Tier 1 — JSON-LD (`schema.org/Product`): name, brand, sku, price, availability, image
2. Tier 2 — Open Graph / meta tags: `og:title`, `og:image`, `product:price:amount`
3. Tier 3 — retailer-specific CSS selectors (the fragile last resort, kept in the adapter file)

Merge tiers so a higher tier is never overwritten — call order *is* the priority ranking:

```ts
function extractProduct(html: string, adapter: RetailerAdapter) {
  const p = emptyProduct();
  mergeIn(p, fromJsonLd(html));                          // Tier 1
  mergeIn(p, fromMetaTags(html));                        // Tier 2
  mergeIn(p, fromSelectors(html, adapter.cssSelectors)); // Tier 3
  p._missingFields = findMissing(p);
  return p;
}
function mergeIn(target: any, source: any) {
  for (const k of Object.keys(source))
    if (target[k] == null && source[k] != null) target[k] = source[k];
}
```

Run scraping in a dedicated worker (not the request path), share one pooled Playwright browser,
always `await page.close()` in a `finally`, and never throw on a missing field — log it and return
partial data. Route requests through ScraperAPI / Bright Data from day one. Prefer official
retailer APIs over scraping where one exists.

**Cross-retailer search — scatter-gather + centralized scoring.** Adapters return *raw*
candidates; matching/scoring happens in ONE place so the logic is identical across retailers. Query
precision-first inside each adapter (barcode → model number → keyword). Score with a confidence
ladder and a price-sanity penalty:

```ts
const normalize = (s: string) => s.replace(/[\s\-\/\.]/g, '').toUpperCase();

function scoreCandidate(q: SearchQuery, c: Candidate): number {
  if (q.upc && c.upc && normalize(q.upc) === normalize(c.upc)) return 1.0;          // gold
  if (q.modelNumber && c.modelNumber &&
      normalize(q.modelNumber) === normalize(c.modelNumber)) return 0.95;           // strong
  let score = stringSimilarity.compareTwoStrings(                                   // fuzzy
    `${q.brand ?? ''} ${q.name}`.toLowerCase().trim(),
    `${c.brand ?? ''} ${c.title}`.toLowerCase().trim());
  if (q.sourcePrice && c.price) {
    const r = c.price / q.sourcePrice;
    if (r < 0.33 || r > 3) score *= 0.5;   // accessory / bundle / wrong item
  }
  return score;
}
```

```ts
// orchestrator: parallel, fault-tolerant, one best result per retailer, cheapest first
export async function searchAllRetailers(q: SearchQuery): Promise<RetailerListing[]> {
  const settled = await Promise.allSettled(
    searchers.map(s => withTimeout(s.search(q), 8000)));   // hard per-retailer cap
  const out: RetailerListing[] = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;                 // skip dead retailers
    const best = r.value.slice(0, 10)
      .map(c => ({ ...c, score: scoreCandidate(q, c) }))
      .filter(c => c.score >= 0.8)
      .sort((a, b) => b.score - a.score)[0];
    if (best) out.push(best);
  }
  return out.sort((a, b) => a.price - b.price);
}
```

Cache scrapes in Redis keyed by URL hash (1h TTL) and searches keyed by
`normalizedModel:retailer` (2h TTL). Upsert `Item` on a composite of `upc`/`modelNumber` so the
catalog never duplicates the same product.

### Part B — Wishlist module API (`lib/modules/wishlist`)

```
POST   /api/wishlist/scrape            { url } → Item + RetailerListing[]  (calls pricing engine)
GET    /api/wishlist                   → user's wishlists with entries
POST   /api/wishlist                   { name } → Wishlist
POST   /api/wishlist/[id]/entries      { itemId, preferredRetailerId?, priceAtSave } → WishlistEntry
DELETE /api/wishlist/[id]/entries/[eid]
GET    /api/items/[id]                 → Item + all RetailerListings
PATCH  /api/items/[id]/refresh         → re-run the pricing engine for this Item
```

Return partial results rather than hard errors: if some retailers fail, return the ones that
succeeded plus an `errors` array. The frontend renders "couldn't find at X" — never a blank page.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| App + API | Next.js 14 (App Router) + TypeScript |
| ORM / DB | Prisma + PostgreSQL |
| Cache | Redis via Upstash |
| Background jobs | BullMQ + Redis (scraping, price refresh) |
| Auth | NextAuth.js (single user now, multi-user-ready) |
| Scraping | Playwright + Cheerio, behind ScraperAPI / Bright Data |
| Styling | Tailwind (set up the theme; Codex builds the UI) |
| Fuzzy matching | `string-similarity` |

---

## Design System Tokens (set these up in the framework — Codex consumes them)

The brand is **DeWalt-style yellow on a warm, Claude-like cream canvas with charcoal ink.** Wire
these into `globals.css` and extend the Tailwind theme so every component references tokens, never
raw hex.

```css
:root {
  /* Brand — yellow is an ACCENT, never a page background */
  --wb-yellow: #FEBD17;        /* CTAs, active nav, key highlights, brand mark, focus rings */
  --wb-yellow-hover: #E9A904;
  --wb-yellow-ink: #2A2206;    /* dark text that goes ON yellow */

  /* Surfaces — warm cream, in the Claude family */
  --wb-bg: #F4F1E9;            /* page canvas */
  --wb-surface: #FCFBF7;       /* cards */
  --wb-surface-2: #EFEBE0;     /* sunken / secondary */

  /* Ink */
  --wb-ink: #1C1A16;           /* primary text */
  --wb-muted: #6B665C;         /* secondary text */
  --wb-faint: #9A9488;         /* hints */
  --wb-border: #E5DFD2;

  /* Semantic */
  --wb-success: #1B6B4A; --wb-success-bg: #E8F0E9;  /* price drops, in-stock */
  --wb-danger:  #B23B2E; --wb-danger-bg:  #F6E8E5;  /* price rises, errors */
}
```

Hard rule for the theme: **never put white/light text on yellow** (use `--wb-yellow-ink`), and
never use yellow as a large fill — it should feel like the painted accent on a power tool, not a
highlighter. Document this in `CONVENTIONS.md` so Codex follows it.

---

## Predicted Backend Issues & How to Handle Them (build the defenses in now)

1. **Retailers block the scraper (403/429/CAPTCHA)** — route through residential proxies from day
   one; detect CAPTCHA markers, retry once with a fresh session, then degrade gracefully. One
   blocked retailer must never fail the whole request.
2. **Selector rot after a retailer redesign** — the extraction waterfall absorbs most of it; alert
   when a retailer's missing-field rate spikes so you know which adapter to fix.
3. **Matcher false positives** (accessories, refurbs, wrong variant) — require model/UPC match or
   ≥ 0.80 name similarity, reject > 3× price gaps, store `matchScore`, capture `condition` so
   refurbs don't masquerade as the cheapest new unit.
4. **Playwright memory leaks** — one pooled browser, always close pages, 15s nav timeout, run in a
   worker, restart every N pages.
5. **Mixed currencies/formats** — parse with a real currency parser; store numeric value + ISO
   currency code separately; convert only at display time.
6. **Retailer API rate limits** — token-bucket per API, cache aggressively, exponential backoff +
   partial results on 429.
7. **Duplicate Items** — upsert on `upc`/`modelNumber`; dedupe listings the same way.
8. **Slow scrapes** — `POST /api/wishlist/scrape` returns the source Item fast; the cross-retailer
   search runs async and the client polls. Hard 8s per-retailer timeout.
9. **Premature coupling** (the extensibility killer) — modules talk through service interfaces, not
   each other's tables. Enforce it in `CONVENTIONS.md` and in how you structure imports.

---

## Deliverables for This Session

1. Project scaffold: Next.js + TS + Prisma + Redis + Tailwind + NextAuth.
2. The **full** Prisma schema above (all domains) with the first migration.
3. Core: db client, redis cache helpers, the domain event bus, money utils.
4. The **Pricing Engine** service (scraper waterfall + matcher + search orchestrator) with at least
   the Amazon, Walmart, and Best Buy adapters.
5. The **Wishlist module**: service + API routes (scrape, search, wishlist CRUD, item refresh).
6. Design tokens wired into `globals.css` + the Tailwind theme.
7. `CONVENTIONS.md` — module layout, service-interface pattern, API conventions, error handling,
   the yellow/cream design rules, and a "how to add a new module" checklist.

**Handoff to Codex:** the schema, the service interfaces, the API route signatures, the design
tokens, and `CONVENTIONS.md`. Keep those stable — Codex builds against them.
