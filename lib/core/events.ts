import { EventEmitter } from "node:events";

/**
 * Lightweight domain-event bus. Reactions across modules are decoupled here so
 * that e.g. "purchase logged → inventory incremented → wishlist entry acquired"
 * never hard-wires expenses into inventory. Listeners for unbuilt domains are
 * registered as stubs now and fleshed out when those modules land.
 *
 * Cross-module rule: emit/handle events; never reach into another module's tables.
 */
export interface DomainEvents {
  "item.upserted": { itemId: string; source: "scrape" | "manual" };
  "listing.priceChanged": { listingId: string; itemId: string; from: number; to: number };
  "purchase.logged": { userId: string; itemId: string; quantity: number; expenseId: string };
  "wishlist.entryAcquired": { entryId: string; itemId: string };
}

type Handler<E extends keyof DomainEvents> = (
  payload: DomainEvents[E],
) => void | Promise<void>;

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

export function on<E extends keyof DomainEvents>(event: E, handler: Handler<E>): void {
  emitter.on(event, handler as (payload: unknown) => void);
}

export function emit<E extends keyof DomainEvents>(event: E, payload: DomainEvents[E]): void {
  // Fire-and-forget; a slow/broken listener must never block the emitter.
  emitter.emit(event, payload);
}

// ---------- Stub listeners (decoupled reactions, filled in per module later) ----------
let registered = false;
export function registerCoreListeners(): void {
  if (registered) return;
  registered = true;

  on("purchase.logged", (p) => {
    // TODO(inventory): increment InventoryRecord for p.itemId by p.quantity.
    // TODO(wishlist): mark matching WishlistEntry acquired -> emit "wishlist.entryAcquired".
    console.debug("[events] purchase.logged (stub)", p);
  });

  on("listing.priceChanged", (p) => {
    // TODO(alerts/M8): notify watchers when a wishlisted item's price drops.
    console.debug("[events] listing.priceChanged (stub)", p);
  });
}

registerCoreListeners();
