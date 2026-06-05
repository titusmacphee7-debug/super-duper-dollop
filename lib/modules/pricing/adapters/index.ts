import type { CssSelectors } from "../extract";
import type { RetailerAdapter } from "./types";
import { amazonAdapter } from "./amazon";
import { walmartAdapter } from "./walmart";
import { bestBuyAdapter } from "./bestbuy";

export type { RetailerAdapter } from "./types";

/** Adapters used for cross-retailer search (scatter-gather). */
export const searchAdapters: RetailerAdapter[] = [amazonAdapter, walmartAdapter, bestBuyAdapter];

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

/** Generic fallback for arbitrary source URLs: structured-data only, no selectors. */
function genericAdapter(url: string): { retailer: string; cssSelectors?: CssSelectors } {
  return { retailer: safeHost(url) };
}

/** Pick the adapter that owns a product URL, or a generic structured-data-only one. */
export function adapterForUrl(url: string): { retailer: string; cssSelectors?: CssSelectors } {
  const match = searchAdapters.find((a) => a.matchesUrl(url));
  if (match) return { retailer: match.retailer, cssSelectors: match.cssSelectors };
  return genericAdapter(url);
}
