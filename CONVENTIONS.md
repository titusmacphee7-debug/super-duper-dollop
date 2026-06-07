# CONVENTIONS.md — Workshop Buddy

The contract. Keep this authoritative and current — it's what every session builds against. If something here is missing or wrong, don't work around it — fix it at the source and note the change in `HANDOFF.md` (the work log).

---

## 1. Architecture in one paragraph

A **modular monolith**: one Next.js 14 (App Router) app split into self-contained domain modules
under `lib/modules/*`. Each module owns its models, business logic (a service layer), and — if it
has one — its API route handlers, and exposes a **single public surface** (`index.ts`). A shared
`Item` catalog is the backbone every domain references. The **Pricing Engine** is a reusable
service (wishlist uses it now; cost-to-complete later). Cross-module calls go through public
service interfaces — **never** a direct Prisma read into another module's tables.

---

## 2. Directory layout

```
app/
  api/**                      route handlers (thin: parse -> call service -> respond)
  (pages)                     the app's UI lives here (pages + components)
  layout.tsx, page.tsx, globals.css
lib/
  core/                       cross-cutting infra (no domain logic)
    db.ts        Prisma singleton            (import { prisma })
    redis.ts     KV + cache helpers          (withCache, hashKey, CACHE_TTL)
    events.ts    domain event bus            (emit, on, DomainEvents)
    money.ts     parse/format money          (parseMoney, formatMoney, Money)
    auth.ts      NextAuth + requireUser/getCurrentUser
    errors.ts    ApiError / NotFoundError / BadRequestError / UnauthorizedError
    http.ts      route helpers               (handle, ok, fail)
  modules/
    pricing/     scraper waterfall + cross-retailer search (shared service)  [IMPLEMENTED]
    catalog/     Item upsert/dedupe (the backbone)                            [IMPLEMENTED]
    wishlist/    Feature 1 service + the API behind app/api/wishlist & items  [IMPLEMENTED]
    inventory/   InventoryRecord, Location (nested)                           [SCAFFOLDED]
    projects/    Project, Task, Requirement                                   [SCAFFOLDED]
    expenses/    Expense                                                      [SCAFFOLDED]
    insights/    derived reads: tool gaps, cost-to-complete                   [SCAFFOLDED]
prisma/
  schema.prisma               ALL domains (schema-first); only wishlist/pricing have services
  migrations/                 first migration committed (0_init)
test/                         vitest; pure-function tests live here
```

---

## 3. The service-interface pattern

Every module exposes exactly one public file: `lib/modules/<name>/index.ts`. It re-exports the
functions and types that other code may use. **Internals are private by convention** — importing
`lib/modules/x/service` (or its `internals`) from outside module `x` is a contract violation.

```ts
// good — depend on the public surface
import { searchAllRetailers } from "@/lib/modules/pricing";
import { upsertItem } from "@/lib/modules/catalog";

// bad — reaching into internals / another module's tables
import { saveListing } from "@/lib/modules/wishlist/service";
import { prisma } from "@/lib/core/db"; // ...then querying another module's models
```

**TypeScript is the enforcer.** Types flow across the boundary, so a contract mismatch fails
`pnpm typecheck`. A red typecheck is a contract problem to fix at the source — never silence it
with `any` or by loosening a service signature.

---

## 4. API conventions

Route handlers are **thin**: validate input, call a service, shape the response. No business logic
or direct DB access in `app/api/**` beyond calling services + `requireUser()`.

- Validate bodies with **zod**; a `ZodError` becomes a 400 automatically via `handle`.
- Wrap every handler body in `handle(async () => …)` from `lib/core/http`. It maps
  `ApiError -> its status`, `ZodError -> 400`, anything else -> 500 (logged).
- Use `ok(data, init?)` / `fail(status, msg)` for responses. Errors are `{ "error": string }`.
- User-scoped routes call `requireUser()` (401 if unresolved). Single-user dev falls back to
  `DEV_USER_EMAIL`, so the API is usable before the auth UI exists.
- Routes that touch the DB/scraper set `export const runtime = "nodejs"` and
  `export const dynamic = "force-dynamic"`.
- **Partial results over hard failure.** If some retailers fail, return what succeeded plus an
  `errors: { retailer, message }[]`. The UI renders "couldn't find at X" — never a blank page.

### Wishlist + items API (stable — build against these)

```
POST   /api/wishlist/scrape          { url } -> { item, listings, missingFields }
GET    /api/wishlist                 -> { wishlists: WishlistWithEntries[] }
POST   /api/wishlist                 { name } -> Wishlist                         (201)
POST   /api/wishlist/[id]/entries    { itemId, preferredRetailerId?, priceAtSave?, note? } -> WishlistEntry (201)
DELETE /api/wishlist/[id]/entries/[eid]  -> { ok: true }
GET    /api/items/[id]               -> { item, listings, errors }
PATCH  /api/items/[id]/refresh       -> { item, listings, errors }   (re-runs the pricing engine)
```

**Two-phase wishlist flow:** `POST /scrape` returns the source Item + its listing *fast*; the
cross-retailer search is `PATCH /api/items/[id]/refresh`, which the compare view polls. A slow
search never blocks the first render.

---

## 5. Error handling

Throw typed errors from services; let routes translate them.

```ts
import { NotFoundError } from "@/lib/core/errors";
if (!item) throw new NotFoundError("item not found"); // -> 404 via handle()
```

`ApiError(status, message)` is the base; `NotFoundError` (404), `BadRequestError` (400),
`UnauthorizedError` (401) are the common ones. Never throw bare strings.

---

## 6. Money

Prices flow through `lib/core/money` — **never raw float math in the UI.** Store a numeric
`amount` + an ISO `currency` separately (the schema already does); parse with `parseMoney`,
display with `formatMoney`. Convert currencies only at display time.

```ts
import { formatMoney } from "@/lib/core/money";
formatMoney({ amount: listing.price, currency: listing.currency }); // "$99.00"
```

---

## 7. Design system (hard rules)

Theme: **"Graphite Pro"** — neutral graphite-dark surfaces with a single calm green accent.
Tokens are defined once in `app/globals.css` (`:root`) and surfaced as Tailwind colors in
`tailwind.config.ts`; complex component styling is ported as `.wb-*` classes in `globals.css`.
Fonts come from `next/font` (Archivo sans, IBM Plex Mono). **Reference token names, never raw hex.**

| Token (CSS var)                         | Tailwind class                          | Use |
|-----------------------------------------|-----------------------------------------|-----|
| `--wb-accent` (+`-hover`/`-pressed`)    | `bg/text/ring-wb-accent` (+`-hover`/`-pressed`) | ACCENT only (green): primary CTA, active nav, best-deal border/tag, brand mark, focus rings, count chip |
| `--wb-on-accent`                        | `text-wb-accent-ink`                    | the ONLY text color allowed on the accent |
| `--wb-app` / `--wb-chrome`              | `bg-wb-app` / `bg-wb-chrome`            | page canvas (graphite) / sidebar·header·rail |
| `--wb-surface` / `-raised` / `-hover`   | `bg-wb-surface` / `-raised` / `-hover`  | card / raised step / hover (elevation rises lighter) |
| `--wb-border` / `-strong`               | `border-wb-border` / `-strong`          | borders (best-deal uses a 2px accent border) |
| `--wb-ink` / `-2` / `-3` / `-dis`       | `text-wb-ink` / `-2` / `-3` / `-dis`    | primary / secondary / subtle / disabled text |
| `--wb-green` / `-bg` / `-bd`            | `text/bg/border-wb-green` (+`-bg`/`-bd`) | in-stock, price drops |
| `--wb-red` / `-bg` / `-bd`              | `text/bg/border-wb-red` (+`-bg`/`-bd`)  | out-of-stock, price rises, errors |

**Non-negotiable:** green is the calm accent, used sparingly — not a highlighter. Never a large
green fill, never a page background, and **never light text on the accent** — always `text-wb-accent-ink`.

---

## 8. House rules (from AGENTS.md)

- **pnpm only.** Never npm/yarn.
- **No default exports** in shared modules (`lib/**`). Named exports only.
- Money goes through `lib/core/money`.
- Evolve the contract deliberately (schema, `lib/modules/*/index.ts`, API signatures, design tokens),
  and every change gets a `HANDOFF.md` entry.
- Migrations are Claude-only and **additive** — the core tables are referenced everywhere.

---

## 9. How to add a new module (checklist)

1. **Schema** — the models already exist in `prisma/schema.prisma` (schema-first). If you need a
   new field, Claude makes an **additive** migration (`pnpm prisma migrate dev`) and notes it in
   `HANDOFF.md`. Never rewrite existing core tables.
2. **Folder** — `lib/modules/<name>/` with `service.ts` (logic), `types.ts` (shapes), and
   `index.ts` (the public surface). Replace the scaffold's `__scaffolded` export.
3. **Cross-module access** — import other modules only via their `index.ts`. Need data you don't
   own? Call that module's service; don't query its tables.
4. **Events** — for reactions across modules, add a key to `DomainEvents` in `lib/core/events.ts`,
   `emit()` it from the owning service, and handle it elsewhere. Keep modules decoupled.
5. **API** — add thin handlers under `app/api/<name>/**`: zod-validate, `requireUser()` if
   user-scoped, wrap in `handle()`, return partial results + `errors[]` where relevant.
6. **Caching** — read-through with `withCache(key, ttl, fn)`; key via `hashKey()`; pick a TTL
   (extend `CACHE_TTL` if it's a new category).
7. **Tests** — unit-test the pure logic (matchers, parsers, derivations) in `test/`.
8. **Green + log** — `pnpm typecheck && pnpm build && pnpm test`, then update this file if you
   changed a pattern, write a `HANDOFF.md` entry, and you're done.
