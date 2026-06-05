import * as cheerio from "cheerio";
import { parseMoney } from "@/lib/core/money";
import type { Product } from "./types";

export interface CssSelectors {
  name?: string;
  price?: string;
  brand?: string;
  image?: string;
  modelNumber?: string;
  availability?: string;
}

export function emptyProduct(): Product {
  return {
    name: null,
    brand: null,
    modelNumber: null,
    upc: null,
    price: null,
    currency: null,
    imageUrl: null,
    availability: null,
    inStock: null,
    condition: null,
    sourceUrl: null,
    retailer: null,
    _missingFields: [],
  };
}

/**
 * Fill-only merge: a field already set by a higher tier is NEVER overwritten,
 * so call order is the priority ranking (JSON-LD > meta > CSS).
 */
export function mergeIn(target: Partial<Product>, source: Partial<Product>): void {
  for (const key of Object.keys(source) as (keyof Product)[]) {
    if (key === "_missingFields") continue;
    const value = source[key];
    if (target[key] == null && value != null) {
      (target as Record<string, unknown>)[key] = value;
    }
  }
}

const REQUIRED_FIELDS: (keyof Product)[] = ["name", "price"];
const IDENTITY_FIELDS: (keyof Product)[] = ["upc", "modelNumber"];

export function findMissing(p: Partial<Product>): string[] {
  const missing = REQUIRED_FIELDS.filter((f) => p[f] == null).map(String);
  if (IDENTITY_FIELDS.every((f) => p[f] == null)) missing.push("identity(upc|modelNumber)");
  return missing;
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

// ---------- Tier 1: JSON-LD (schema.org/Product) ----------
function collectObjects(data: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(data)) {
    for (const d of data) collectObjects(d, out);
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj["@graph"]) collectObjects(obj["@graph"], out);
    out.push(obj);
  }
}

function typeIncludesProduct(t: unknown): boolean {
  if (typeof t === "string") return t.toLowerCase().includes("product");
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.toLowerCase().includes("product"));
  return false;
}

export function fromJsonLd(html: string): Partial<Product> {
  const out: Partial<Product> = {};
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return out;
  }
  $('script[type="application/ld+json"]').each((_i, el) => {
    const txt = $(el).contents().text();
    if (!txt) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(txt);
    } catch {
      return;
    }
    const objects: Record<string, unknown>[] = [];
    collectObjects(parsed, objects);
    for (const obj of objects) {
      if (!typeIncludesProduct(obj["@type"])) continue;
      const brand = obj.brand;
      const brandName =
        typeof brand === "string"
          ? brand
          : asString((brand as Record<string, unknown> | undefined)?.name);
      const offersRaw = obj.offers;
      const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
      const offerObj = (offer && typeof offer === "object" ? offer : {}) as Record<string, unknown>;
      const priceStr = asString(offerObj.price ?? offerObj.lowPrice);
      const money = priceStr ? parseMoney(priceStr, asString(offerObj.priceCurrency) ?? "USD") : null;
      const availability = asString(offerObj.availability);
      mergeIn(out, {
        name: asString(obj.name),
        brand: brandName,
        modelNumber: asString(obj.mpn) ?? asString(obj.sku) ?? asString(obj.model),
        upc: asString(obj.gtin13) ?? asString(obj.gtin) ?? asString(obj.gtin12),
        price: money?.amount ?? null,
        currency: money?.currency ?? asString(offerObj.priceCurrency),
        imageUrl: Array.isArray(obj.image) ? asString(obj.image[0]) : asString(obj.image),
        availability,
        inStock: availability ? /instock|in_stock|limited/i.test(availability) : null,
      });
    }
  });
  return out;
}

// ---------- Tier 2: Open Graph / meta tags ----------
export function fromMetaTags(html: string): Partial<Product> {
  const out: Partial<Product> = {};
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return out;
  }
  const meta = (sel: string): string | null => {
    const c = $(sel).attr("content");
    return c && c.trim() ? c.trim() : null;
  };
  const priceStr =
    meta('meta[property="product:price:amount"]') ?? meta('meta[itemprop="price"]');
  const currency =
    meta('meta[property="product:price:currency"]') ?? meta('meta[property="og:price:currency"]');
  const money = priceStr ? parseMoney(priceStr, currency ?? "USD") : null;
  mergeIn(out, {
    name: meta('meta[property="og:title"]') ?? meta('meta[name="twitter:title"]'),
    brand: meta('meta[property="product:brand"]') ?? meta('meta[property="og:brand"]'),
    imageUrl: meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]'),
    price: money?.amount ?? null,
    currency: money?.currency ?? currency,
  });
  return out;
}

// ---------- Tier 3: retailer-specific CSS selectors (fragile last resort) ----------
export function fromSelectors(html: string, selectors: CssSelectors | undefined): Partial<Product> {
  const out: Partial<Product> = {};
  if (!selectors) return out;
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return out;
  }
  const text = (sel?: string): string | null => {
    if (!sel) return null;
    const t = $(sel).first().text();
    return t && t.trim() ? t.trim() : null;
  };
  const priceStr = text(selectors.price);
  const money = priceStr ? parseMoney(priceStr) : null;
  let imageUrl: string | null = null;
  if (selectors.image) {
    const el = $(selectors.image).first();
    imageUrl = el.attr("src") ?? el.attr("content") ?? null;
  }
  const availability = text(selectors.availability);
  mergeIn(out, {
    name: text(selectors.name),
    brand: text(selectors.brand),
    modelNumber: text(selectors.modelNumber),
    price: money?.amount ?? null,
    currency: money?.currency ?? null,
    imageUrl,
    availability,
    inStock: availability ? /in stock|add to cart/i.test(availability) : null,
  });
  return out;
}

export interface ExtractAdapter {
  retailer: string;
  cssSelectors?: CssSelectors;
}

/**
 * The extraction waterfall. Structured data first (rarely changes), CSS last
 * (fragile). Never throws on a missing field — records it in _missingFields.
 */
export function extractProduct(html: string, adapter: ExtractAdapter): Product {
  const p = emptyProduct();
  p.retailer = adapter.retailer;
  mergeIn(p, fromJsonLd(html)); // Tier 1
  mergeIn(p, fromMetaTags(html)); // Tier 2
  mergeIn(p, fromSelectors(html, adapter.cssSelectors)); // Tier 3
  p._missingFields = findMissing(p);
  return p;
}
