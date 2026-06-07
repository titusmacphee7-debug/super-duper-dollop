"use client";

import { useCallback, useState } from "react";
import { Icon } from "./icons";
import { Header, MissCard, RetailerCard, SkeletonCard, SourceProduct } from "./cards";
import {
  cheapestListing,
  type ApiWishlist,
  type ItemView,
  type ListingView,
  type RetailerError,
} from "./view-model";

const SEARCH_RETAILERS = ["Amazon", "Walmart", "Best Buy"];

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

/** A pasted product URL vs. a typed product name. */
function looksLikeUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\//i.test(t) || /^[^\s/]+\.[a-z]{2,}([/?#]|$)/i.test(t);
}

export function CompareView() {
  const [query, setQuery] = useState("");
  const [sourceItem, setSourceItem] = useState<ItemView | null>(null);
  const [sourceSaved, setSourceSaved] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ListingView[]>([]);
  const [errors, setErrors] = useState<RetailerError[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);

  const onCompare = useCallback(async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSourceItem(null);
    setResults([]);
    setErrors([]);
    setCompareError(null);
    setSourceSaved(false);
    try {
      let data: { item: ItemView; listings?: ListingView[]; errors?: RetailerError[] };
      if (looksLikeUrl(q)) {
        // Phase 1 — resolve the pasted URL to a canonical Item (shows immediately).
        const scrape = await postJson("/api/wishlist/scrape", { url: q });
        setSourceItem(scrape.item as ItemView);
        // Phase 2 — cross-retailer search.
        data = await postJson(`/api/items/${scrape.item.id}/refresh`, undefined, "PATCH");
      } else {
        // Name/keyword search resolves the item + matches in one call.
        data = await postJson("/api/wishlist/search", { query: q });
        setSourceItem(data.item);
      }
      setResults(data.listings ?? []);
      setErrors(data.errors ?? []);
    } catch (e) {
      setCompareError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setSearching(false);
    }
  }, [query, searching]);

  const onSave = useCallback(async () => {
    if (!sourceItem) return;
    const next = !sourceSaved;
    setSourceSaved(next); // optimistic
    if (!next) return; // un-save is visual-only for now (delete needs the entry id)
    try {
      const got = (await fetch("/api/wishlist").then((r) => (r.ok ? r.json() : null))) as
        | { wishlists: ApiWishlist[] }
        | null;
      const wishlistId =
        got?.wishlists?.[0]?.id ?? ((await postJson("/api/wishlist", { name: "Shop upgrades" })).id as string);
      const priceAtSave = cheapestListing(results)?.price ?? null;
      await postJson(`/api/wishlist/${wishlistId}/entries`, { itemId: sourceItem.id, priceAtSave });
    } catch (e) {
      console.error("[wishlist] save failed", e);
      setSourceSaved(false); // roll back the optimistic flip
    }
  }, [sourceItem, sourceSaved, results]);

  const resolvedListings = [...results].sort((a, b) => a.price - b.price);
  const bestId = resolvedListings.filter((l) => l.inStock).sort((a, b) => a.price - b.price)[0]?.id;
  const total = results.length + errors.length;
  const started = searching || sourceItem !== null;

  return (
    <>
      <Header value={query} onChange={setQuery} onCompare={onCompare} busy={searching} />
      <div className="wb-page">
        {!started ? (
          <div className="wb-results-empty">
            {compareError ?? "Paste a product URL or type a product name above, then hit Compare."}
          </div>
        ) : (
          <>
            {sourceItem && <SourceProduct item={sourceItem} saved={sourceSaved} onSave={onSave} />}
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
                      {results.length} of {total} retailers matched · cheapest in-stock wins
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
              {!searching && !compareError && total === 0 && sourceItem && (
                <div className="wb-results-empty">No retailer matches yet — try Re-run.</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
