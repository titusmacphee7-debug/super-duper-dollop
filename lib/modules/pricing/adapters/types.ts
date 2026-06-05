import type { Candidate, SearchQuery } from "../types";
import type { CssSelectors } from "../extract";
import type { Fetcher } from "../fetcher";

/**
 * A retailer adapter owns ONLY retailer-specific concerns: how to recognize its
 * URLs, its fragile CSS selectors, and how to build/parse its search results into
 * RAW candidates. Scoring/matching is centralized in matcher.ts — never here.
 */
export interface RetailerAdapter {
  retailer: string;
  matchesUrl(url: string): boolean;
  cssSelectors: CssSelectors;
  /** Precision-first search (barcode -> model -> keyword). Must never throw. */
  search(query: SearchQuery, fetcher: Fetcher): Promise<Candidate[]>;
}

/** Build the most precise query string available for a retailer search box. */
export function precisionQuery(q: SearchQuery): string {
  if (q.upc) return q.upc;
  if (q.modelNumber) return `${q.brand ?? ""} ${q.modelNumber}`.trim();
  return `${q.brand ?? ""} ${q.name}`.trim();
}
