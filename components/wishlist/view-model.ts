import { formatMoney } from "@/lib/core/money";

/**
 * Client-side view models. These mirror the JSON the API routes return (Prisma rows
 * over the wire, dates as strings) — see lib/modules/wishlist/types.ts + schema.prisma.
 * The UI only reads the fields it renders; extra fields on the wire are ignored.
 */
export interface ItemView {
  id: string;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  upc: string | null;
  category: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
}

export interface ListingView {
  id: string;
  retailer: string;
  url: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  inStock: boolean;
  shipping: string | null;
  condition: string | null;
  matchScore: number | null;
}

export interface RetailerError {
  retailer: string;
  message: string;
}

/** Shape of GET /api/wishlist entries (WishlistEntry + included item + listings). */
export interface ApiWishlistEntry {
  id: string;
  priceAtSave: number | null;
  acquired: boolean;
  item: ItemView & { listings: ListingView[] };
}
export interface ApiWishlist {
  id: string;
  name: string;
  entries: ApiWishlistEntry[];
}

export interface EntryView {
  id: string;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  priceAtSave: number | null;
  currentPrice: number | null;
  cheapestRetailer: string | null;
  inStock: boolean;
  acquired: boolean;
}

/** Currency formatting goes through lib/core/money (house rule) — never raw float math. */
export function fmt(n: number | null | undefined, currency = "USD"): string {
  if (n == null) return "—";
  return formatMoney({ amount: n, currency });
}

/** Cheapest in-stock listing, else cheapest overall, else null. */
export function cheapestListing(listings: ListingView[]): ListingView | null {
  if (!listings.length) return null;
  const sorted = [...listings].sort((a, b) => a.price - b.price);
  return sorted.find((l) => l.inStock) ?? sorted[0];
}

export function mapEntry(e: ApiWishlistEntry): EntryView {
  const cheapest = cheapestListing(e.item.listings ?? []);
  return {
    id: e.id,
    name: e.item.name,
    brand: e.item.brand,
    modelNumber: e.item.modelNumber,
    priceAtSave: e.priceAtSave,
    currentPrice: cheapest?.price ?? null,
    cheapestRetailer: cheapest?.retailer ?? null,
    inStock: cheapest?.inStock ?? false,
    acquired: e.acquired,
  };
}

/** Human label for a confidence score, aligned to lib/modules/pricing/matcher.ts tiers. */
export function matchBasis(score: number | null): string {
  if (score == null) return "Match";
  if (score >= 1) return "UPC exact";
  if (score >= 0.95) return "Model # exact";
  if (score >= 0.8) return "Name + brand match";
  return "Low confidence";
}

/** Retailer monogram tile (text wordmark + brand tint), with a derived fallback. */
export function retailerMark(retailer: string): { short: string; tone: string } {
  const known: Record<string, { short: string; tone: string }> = {
    Amazon: { short: "az", tone: "#FF9900" },
    Walmart: { short: "W", tone: "#4DA9E8" },
    "Best Buy": { short: "BB", tone: "#FFE000" },
    "Home Depot": { short: "HD", tone: "#F96302" },
  };
  if (known[retailer]) return known[retailer];
  const letters = retailer.replace(/[^a-z0-9]/gi, "").slice(0, 2) || "·";
  return { short: letters, tone: "#9aa3ab" };
}

/** Hostname (sans www) for display, falling back to the raw string. */
export function hostOf(url: string | null): string {
  if (!url) return "source";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
