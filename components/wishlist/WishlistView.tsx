"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { SavedEntryCard } from "./cards";
import { mapEntry, type ApiWishlist, type EntryView } from "./view-model";

export function WishlistView() {
  const [name, setName] = useState("Shop upgrades");
  const [entries, setEntries] = useState<EntryView[] | null>(null); // null = loading

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = (await fetch("/api/wishlist").then((r) => (r.ok ? r.json() : null))) as
          | { wishlists: ApiWishlist[] }
          | null;
        if (!active) return;
        const wl = data?.wishlists?.[0];
        if (wl) {
          setName(wl.name);
          setEntries(wl.entries.map(mapEntry));
        } else {
          setEntries([]);
        }
      } catch {
        if (active) setEntries([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <header className="wb-header">
        <div className="wb-wordmark">
          <span className="wb-wordmark-bolt">
            <Icon name="bolt" size={15} />
          </span>
          <span className="wb-wordmark-text">
            WORKSHOP<span className="wb-wordmark-thin"> BUDDY</span>
          </span>
        </div>
        <div className="wb-header-spacer" />
        <Link href="/compare" className="wb-cta">
          <Icon name="plus" size={15} /> Compare a product
        </Link>
      </header>
      <div className="wb-page">
        <div className="wb-wishlist-head">
          <div className="wb-wishlist-title">
            <h1>Saved wishlist</h1>
            {entries && <span className="wb-panel-count">{entries.length}</span>}
          </div>
          <div className="wb-panel-sub">{name} · price-tracked since save</div>
        </div>
        {entries === null ? (
          <div className="wb-results-empty">Loading your saved items…</div>
        ) : entries.length === 0 ? (
          <div className="wb-results-empty">
            No saved items yet —{" "}
            <Link href="/compare" className="wb-inline-link">
              compare a product
            </Link>{" "}
            and save it to track its price.
          </div>
        ) : (
          <div className="wb-savegrid">
            {entries.map((e) => (
              <SavedEntryCard key={e.id} entry={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
