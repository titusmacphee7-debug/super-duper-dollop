import { cacheGetJson, cacheSetJson, CACHE_TTL } from "@/lib/core/redis";
import { searchAdapters, type RetailerAdapter } from "./adapters";
import { getFetcher } from "./fetcher";
import { MATCH_THRESHOLD, normalize, scoreCandidate } from "./matcher";
import type { Candidate, RetailerResult, SearchOutcome, SearchQuery } from "./types";

const PER_RETAILER_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function searchCacheKey(q: SearchQuery, retailer: string): string {
  const id = normalize(q.modelNumber || q.upc || q.name || "");
  return `search:${id}:${retailer}`;
}

async function searchOneRetailer(adapter: RetailerAdapter, q: SearchQuery): Promise<Candidate[]> {
  const key = searchCacheKey(q, adapter.retailer);
  const cached = await cacheGetJson<Candidate[]>(key);
  if (cached) return cached;
  const fresh = await adapter.search(q, getFetcher());
  if (fresh.length) await cacheSetJson(key, fresh, CACHE_TTL.search);
  return fresh;
}

/**
 * Scatter-gather: every retailer searched in parallel with a hard 8s cap.
 * One best (>= threshold) candidate per retailer, cheapest first. Dead retailers
 * are skipped and reported in `errors` — they never fail the whole request.
 */
export async function searchAllRetailers(q: SearchQuery): Promise<SearchOutcome> {
  const settled = await Promise.allSettled(
    searchAdapters.map((adapter) =>
      withTimeout(searchOneRetailer(adapter, q), PER_RETAILER_TIMEOUT_MS).then((candidates) => ({
        retailer: adapter.retailer,
        candidates,
      })),
    ),
  );

  const results: RetailerResult[] = [];
  const errors: { retailer: string; message: string }[] = [];

  settled.forEach((settledResult, i) => {
    const retailer = searchAdapters[i].retailer;
    if (settledResult.status !== "fulfilled") {
      const reason = settledResult.reason;
      errors.push({ retailer, message: reason instanceof Error ? reason.message : String(reason) });
      return;
    }
    const best = settledResult.value.candidates
      .slice(0, 10)
      .map((c) => ({ ...c, score: scoreCandidate(q, c) }))
      // A non-positive price is a parse error / placeholder, never a real "cheapest" offer.
      .filter((c) => c.score >= MATCH_THRESHOLD && c.price != null && c.price > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (best && best.price != null && best.price > 0) {
      results.push({
        retailer,
        url: best.url,
        price: best.price,
        currency: best.currency ?? "USD",
        inStock: best.inStock ?? true,
        shipping: best.shipping ?? null,
        condition: best.condition ?? null,
        matchScore: best.score,
        imageUrl: best.imageUrl ?? null,
        title: best.title,
      });
    } else {
      errors.push({ retailer, message: "no confident match found" });
    }
  });

  results.sort((a, b) => a.price - b.price);
  return { results, errors };
}
