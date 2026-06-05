import type { Item, RetailerListing, Wishlist, WishlistEntry } from "@prisma/client";
import type { Product } from "@/lib/modules/pricing";

export interface ScrapeResult {
  item: Item;
  product: Product;
  listings: RetailerListing[];
  missingFields: string[];
}

export interface ItemWithListings {
  item: Item;
  listings: RetailerListing[];
  errors: { retailer: string; message: string }[];
}

export type WishlistWithEntries = Wishlist & {
  entries: (WishlistEntry & { item: Item & { listings: RetailerListing[] } })[];
};

export interface AddEntryInput {
  itemId: string;
  preferredRetailerId?: string | null;
  priceAtSave?: number | null;
  note?: string | null;
}
