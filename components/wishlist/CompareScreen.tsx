"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons";
import { Header, MissCard, RetailerCard, SkeletonCard, Sidebar, SourceProduct, WishlistPanel } from "./cards";
import {
  cheapestListing,
  mapEntry,
  type ApiWishlist,
  type EntryView,
  type ItemView,
  type ListingView,
  type RetailerError,
} from "./view-model";

// Retailers the pricing engine fans out to — drives the loading skeletons (lib/modules/pricing/adapters).
const SEARCH_RETAILERS = ["Amazon", "Walmart", "Best Buy"];
const EXAMPLE_URL = "https://www.dewalt.com/product/dcd771c2/20v-max-compact-drill-driver-kit";

async function postJson(url: string, body?: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `${method} ${url} failed (${res.status})`);
  return data;
}

export function CompareScreen() {
  const [url, setUrl] = useState(EXAMPLE_URL);
  const [sourceItem, setSourceItem] = useState<ItemView | null>(null);
  const [sourceSaved, setSourceSaved] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ListingView[]>([]);
  const [errors, setErrors] = useState<RetailerError[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<{ id: string; name: string; entries: EntryView[] } | null>(null);

  const loadWishlist = useCallback(async () => {
    try {
      const data = (await fetch("/api/wishlist").then((r) => (r.ok ? r.json() : null))) as
        | { wishlists: ApiWishlist[] }
        | null;
      const wl = data?.wishlists?.[0];
      if (wl) setWishlist({ id: wl.id, name: wl.name, entries: wl.entries.map(mapEntry) });
    } catch {
      /* no DB / offline — leave the panel in its empty state */
    }
  }, []);

  useEffect(() => {
    void loadWishlist();
  }, [loadWishlist]);

  const onCompare = useCallback(async () => {
    const u = url.trim();
    if (!u || searching) return;
    setSearching(true);
    setResults([]);
    setErrors([]);
    setCompareError(null);
    setSourceSaved(false);
    try {
      // Phase 1 — resolve the pasted URL to a canonical Item (shows immediately).
      const scrape = await postJson("/api/wishlist/scrape", { url: u });
      setSourceItem(scrape.item as ItemView);
      // Phase 2 — cross-retailer search; the engine returns matches + per-retailer misses.
      const refreshed = await postJson(`/api/items/${scrape.item.id}/refresh`, undefined, "PATCH");
      setResults((refreshed.listings as ListingView[]) ?? []);
      setErrors((refreshed.errors as RetailerError[]) ?? []);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setSearching(false);
    }
  }, [url, searching]);

  const onSave = useCallback(async () => {
    if (!sourceItem) return;
    const next = !sourceSaved;
    setSourceSaved(next); // optimistic
    if (!next) return; // un-save is visual-only for now (delete needs the entry id)
    try {
      let wishlistId = wishlist?.id;
      if (!wishlistId) {
        const got = (await fetch("/api/wishlist").then((r) => (r.ok ? r.json() : null))) as
          | { wishlists: ApiWishlist[] }
          | null;
        wishlistId = got?.wishlists?.[0]?.id ?? ((await postJson("/api/wishlist", { name: "Shop upgrades" })).id as string);
      }
      const priceAtSave = cheapestListing(results)?.price ?? null;
      await postJson(`/api/wishlist/${wishlistId}/entries`, { itemId: sourceItem.id, priceAtSave });
      await loadWishlist();
    } catch (e) {
      console.error("[wishlist] save failed", e);
      setSourceSaved(false); // roll back the optimistic flip
    }
  }, [sourceItem, sourceSaved, wishlist, results, loadWishlist]);

  const resolvedListings = [...results].sort((a, b) => a.price - b.price);
  const bestId = resolvedListings.filter((l) => l.inStock).sort((a, b) => a.price - b.price)[0]?.id;
  const matched = results.length;
  const total = results.length + errors.length;

  return (
    <div className="wb-root">
      <Sidebar active="wishlist" />
      <div className="wb-shell">
        <Header value={url} onChange={setUrl} onCompare={onCompare} busy={searching} />
        <div className="wb-body">
          <main className="wb-main">
            {sourceItem ? (
              <>
                <SourceProduct item={sourceItem} saved={sourceSaved} onSave={onSave} />
                <div className="wb-results-head">
                  <div className="wb-results-title">
                    <h2>Price comparison</h2>
                    <span className="wb-results-meta">
                      {searching ? (
                        <>
                          <span className="wb-spin">
                            <Icon name="refresh" size={13} />
                          </span>{" "}
                          searching {SEARCH_RETAILERS.length} retailers…
                        </>
                      ) : (
                        <>
                          {matched} of {total} retailers matched · cheapest in-stock wins
                        </>
                      )}
                    </span>
                  </div>
                  <button className="wb-rerun" onClick={onCompare} disabled={searching}>
                    <Icon name="refresh" size={14} /> Re-run
                  </button>
                </div>
                <div className="wb-rlist">
                  {compareError && <div className="wb-results-error">{compareError}</div>}
                  {resolvedListings.map((l) => (
                    <RetailerCard key={l.id} listing={l} best={l.id === bestId} />
                  ))}
                  {!searching && errors.map((e) => <MissCard key={e.retailer} error={e} />)}
                  {searching && SEARCH_RETAILERS.map((r) => <SkeletonCard key={r} retailer={r} />)}
                  {!searching && !compareError && total === 0 && (
                    <div className="wb-results-empty">No retailer matches yet — try Re-run.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="wb-results-empty">
                {compareError
                  ? compareError
                  : "Paste a product URL above and hit Compare to see prices across retailers."}
              </div>
            )}
          </main>
          <div className="wb-rail">
            <WishlistPanel name={wishlist?.name ?? "Shop upgrades"} entries={wishlist?.entries ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
