// Public surface of the wishlist module (Feature 1). API routes call ONLY these.
export {
  scrapeToItem,
  refreshItem,
  getItemWithListings,
  listWishlists,
  createWishlist,
  addEntry,
  removeEntry,
} from "./service";

export type {
  ScrapeResult,
  ItemWithListings,
  WishlistWithEntries,
  AddEntryInput,
} from "./types";
