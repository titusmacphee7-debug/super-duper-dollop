import type { RetailerListing } from "@prisma/client";
import { prisma } from "@/lib/core/db";
import { emit } from "@/lib/core/events";
import { NotFoundError } from "@/lib/core/errors";
import { productToItemInput, upsertItem } from "@/lib/modules/catalog";
import { scrapeProduct, searchAllRetailers, type SearchQuery } from "@/lib/modules/pricing";
import type {
  AddEntryInput,
  ItemWithListings,
  ScrapeResult,
  WishlistWithEntries,
} from "./types";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

interface ListingData {
  retailer: string;
  url: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  inStock: boolean;
  shipping?: string | null;
  condition?: string | null;
  matchScore?: number | null;
}

/** Upsert a listing per (item, retailer); append the old price to priceHistory on change. */
async function saveListing(itemId: string, data: ListingData): Promise<RetailerListing> {
  const existing = await prisma.retailerListing.findFirst({
    where: { itemId, retailer: data.retailer },
  });

  if (existing) {
    const priceChanged = existing.price !== data.price;
    const priceHistory = priceChanged ? [...existing.priceHistory, existing.price] : existing.priceHistory;
    const updated = await prisma.retailerListing.update({
      where: { id: existing.id },
      data: {
        url: data.url,
        price: data.price,
        originalPrice: data.originalPrice ?? null,
        currency: data.currency,
        inStock: data.inStock,
        shipping: data.shipping ?? null,
        condition: data.condition ?? null,
        matchScore: data.matchScore ?? null,
        priceHistory,
      },
    });
    if (priceChanged) {
      emit("listing.priceChanged", {
        listingId: updated.id,
        itemId,
        from: existing.price,
        to: data.price,
      });
    }
    return updated;
  }

  return prisma.retailerListing.create({
    data: {
      itemId,
      retailer: data.retailer,
      url: data.url,
      price: data.price,
      originalPrice: data.originalPrice ?? null,
      currency: data.currency,
      inStock: data.inStock,
      shipping: data.shipping ?? null,
      condition: data.condition ?? null,
      matchScore: data.matchScore ?? null,
    },
  });
}

/**
 * Phase 1 of the wishlist flow: scrape a pasted URL into an Item + its source
 * listing, fast. Cross-retailer search is a separate call (refreshItem) the UI
 * polls — so a slow search never blocks the first render.
 */
export async function scrapeToItem(url: string): Promise<ScrapeResult> {
  const product = await scrapeProduct(url);
  const item = await upsertItem(productToItemInput(product));

  if (product.price != null) {
    await saveListing(item.id, {
      retailer: product.retailer ?? hostOf(url),
      url,
      price: product.price,
      currency: product.currency ?? "USD",
      inStock: product.inStock ?? true,
      condition: product.condition ?? "new",
      matchScore: 1,
    });
  }

  const listings = await prisma.retailerListing.findMany({
    where: { itemId: item.id },
    orderBy: { price: "asc" },
  });
  return { item, product, listings, missingFields: product._missingFields };
}

/**
 * Phase 2: run the cross-retailer pricing search for an Item, persist the
 * results as listings, and return everything (with per-retailer errors).
 */
export async function refreshItem(itemId: string): Promise<ItemWithListings> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("item not found");

  const source = item.sourceUrl
    ? await prisma.retailerListing.findFirst({ where: { itemId, url: item.sourceUrl } })
    : null;

  const query: SearchQuery = {
    name: item.name,
    brand: item.brand,
    modelNumber: item.modelNumber,
    upc: item.upc,
    sourcePrice: source?.price ?? null,
  };

  const outcome = await searchAllRetailers(query);
  for (const r of outcome.results) {
    await saveListing(itemId, {
      retailer: r.retailer,
      url: r.url,
      price: r.price,
      originalPrice: r.originalPrice ?? null,
      currency: r.currency,
      inStock: r.inStock,
      shipping: r.shipping ?? null,
      condition: r.condition ?? null,
      matchScore: r.matchScore,
    });
  }

  const listings = await prisma.retailerListing.findMany({
    where: { itemId },
    orderBy: { price: "asc" },
  });
  return { item, listings, errors: outcome.errors };
}

export async function getItemWithListings(itemId: string): Promise<ItemWithListings> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new NotFoundError("item not found");
  const listings = await prisma.retailerListing.findMany({
    where: { itemId },
    orderBy: { price: "asc" },
  });
  return { item, listings, errors: [] };
}

// ---------- Wishlist CRUD ----------
export async function listWishlists(userId: string): Promise<WishlistWithEntries[]> {
  return prisma.wishlist.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      entries: {
        orderBy: { addedAt: "desc" },
        include: { item: { include: { listings: { orderBy: { price: "asc" } } } } },
      },
    },
  });
}

export async function createWishlist(userId: string, name: string) {
  return prisma.wishlist.create({ data: { userId, name } });
}

async function assertOwnedWishlist(userId: string, wishlistId: string): Promise<void> {
  const wl = await prisma.wishlist.findFirst({ where: { id: wishlistId, userId } });
  if (!wl) throw new NotFoundError("wishlist not found");
}

export async function addEntry(userId: string, wishlistId: string, input: AddEntryInput) {
  await assertOwnedWishlist(userId, wishlistId);
  return prisma.wishlistEntry.create({
    data: {
      wishlistId,
      itemId: input.itemId,
      preferredRetailerId: input.preferredRetailerId ?? null,
      priceAtSave: input.priceAtSave ?? null,
      note: input.note ?? null,
    },
    include: { item: true },
  });
}

export async function removeEntry(userId: string, wishlistId: string, entryId: string): Promise<void> {
  await assertOwnedWishlist(userId, wishlistId);
  await prisma.wishlistEntry.deleteMany({ where: { id: entryId, wishlistId } });
}
