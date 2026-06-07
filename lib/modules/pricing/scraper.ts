import { cacheGetJson, cacheSetJson, hashKey, CACHE_TTL } from "@/lib/core/redis";
import { getFetcher, looksBlocked } from "./fetcher";
import { adapterForUrl } from "./adapters";
import { extractProduct } from "./extract";
import { assertPublicHttpUrl } from "./ssrf";
import type { Product } from "./types";

/**
 * Scrape a single product URL into a Product via the extraction waterfall.
 * Cached by URL hash for 1h. Returns partial data rather than throwing.
 */
export async function scrapeProduct(url: string): Promise<Product> {
  await assertPublicHttpUrl(url); // SSRF guard: reject loopback/link-local/private targets
  const key = hashKey("scrape", url);
  const cached = await cacheGetJson<Product>(key);
  if (cached) return cached;

  const product = await doScrape(url);
  // Only cache useful results — never poison the cache with a blocked/empty page.
  if (product.name && !product._missingFields.includes("blocked")) {
    await cacheSetJson(key, product, CACHE_TTL.scrape);
  }
  return product;
}

async function doScrape(url: string): Promise<Product> {
  const fetcher = getFetcher();
  const adapter = adapterForUrl(url);

  let result = await fetcher.fetchHtml(url);
  if (looksBlocked(result)) {
    // Retry once with a fresh request/session before degrading gracefully.
    result = await fetcher.fetchHtml(url);
  }

  const product = extractProduct(result.html, adapter);
  product.sourceUrl = url;
  if (!product.name && looksBlocked(result)) {
    product._missingFields = Array.from(new Set([...product._missingFields, "blocked"]));
  }
  return product;
}
