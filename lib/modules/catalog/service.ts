import type { Item } from "@prisma/client";
import { prisma } from "@/lib/core/db";
import { emit } from "@/lib/core/events";
import type { Product } from "@/lib/modules/pricing";

export interface ItemInput {
  name: string;
  brand?: string | null;
  modelNumber?: string | null;
  upc?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
}

/**
 * Upsert the canonical Item, deduping on upc then modelNumber so the catalog
 * never stores the same product twice. There is no DB unique constraint on those
 * (they're nullable + indexed), so the match is done explicitly here.
 */
export async function upsertItem(input: ItemInput): Promise<Item> {
  let existing: Item | null = null;
  if (input.upc) existing = await prisma.item.findFirst({ where: { upc: input.upc } });
  if (!existing && input.modelNumber) {
    existing = await prisma.item.findFirst({ where: { modelNumber: input.modelNumber } });
  }

  if (existing) {
    const item = await prisma.item.update({
      where: { id: existing.id },
      data: {
        // Fill gaps without clobbering data we already trust.
        name: existing.name || input.name,
        brand: existing.brand ?? input.brand ?? null,
        modelNumber: existing.modelNumber ?? input.modelNumber ?? null,
        upc: existing.upc ?? input.upc ?? null,
        category: existing.category ?? input.category ?? null,
        imageUrl: existing.imageUrl ?? input.imageUrl ?? null,
        sourceUrl: existing.sourceUrl ?? input.sourceUrl ?? null,
      },
    });
    emit("item.upserted", { itemId: item.id, source: "scrape" });
    return item;
  }

  const created = await prisma.item.create({
    data: {
      name: input.name,
      brand: input.brand ?? null,
      modelNumber: input.modelNumber ?? null,
      upc: input.upc ?? null,
      category: input.category ?? null,
      imageUrl: input.imageUrl ?? null,
      sourceUrl: input.sourceUrl ?? null,
    },
  });
  emit("item.upserted", { itemId: created.id, source: "scrape" });
  return created;
}

/** Convenience: build an ItemInput from a scraped Product. */
export function productToItemInput(p: Product): ItemInput {
  return {
    name: p.name ?? "Unknown product",
    brand: p.brand,
    modelNumber: p.modelNumber,
    upc: p.upc,
    category: "other",
    imageUrl: p.imageUrl,
    sourceUrl: p.sourceUrl,
  };
}

export async function getItem(id: string): Promise<Item | null> {
  return prisma.item.findUnique({ where: { id } });
}
