// Public types for the Pricing Engine. Shared by the wishlist now and
// cost-to-complete later — keep these stable; they are part of the contract.

/** Canonical product shape produced by the scraper's extraction waterfall. */
export interface Product {
  name: string | null;
  brand: string | null;
  modelNumber: string | null;
  upc: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  availability: string | null; // raw availability text or schema.org URL
  inStock: boolean | null;
  condition: string | null; // 'new' | 'renewed' | 'used' | 'open-box'
  sourceUrl: string | null;
  retailer: string | null;
  _missingFields: string[];
}

/** Query used to find the same product across other retailers. */
export interface SearchQuery {
  name: string;
  brand?: string | null;
  modelNumber?: string | null;
  upc?: string | null;
  sourcePrice?: number | null;
}

/** Raw, UNSCORED result returned by a retailer adapter. */
export interface Candidate {
  retailer: string;
  title: string;
  brand?: string | null;
  modelNumber?: string | null;
  upc?: string | null;
  price: number | null;
  currency?: string | null;
  url: string;
  imageUrl?: string | null;
  inStock?: boolean;
  shipping?: string | null;
  condition?: string | null;
}

export interface ScoredCandidate extends Candidate {
  score: number;
}

/** One retailer's best match, shaped to map cleanly onto a RetailerListing row. */
export interface RetailerResult {
  retailer: string;
  url: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  inStock: boolean;
  shipping?: string | null;
  condition?: string | null;
  matchScore: number;
  imageUrl?: string | null;
  title: string;
}

/** Partial-results contract: succeeded retailers + per-retailer errors. */
export interface SearchOutcome {
  results: RetailerResult[];
  errors: { retailer: string; message: string }[];
}
