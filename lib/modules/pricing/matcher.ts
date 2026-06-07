import { compareTwoStrings } from "string-similarity";
import type { Candidate, SearchQuery } from "./types";

/** Strip separators/case so "DCD771C2" and "dcd-771 c2" compare equal. */
export const normalize = (s: string): string => s.replace(/[\s\-/.]/g, "").toUpperCase();

export const MATCH_THRESHOLD = 0.8;

/**
 * Centralized confidence scoring — identical across every retailer.
 *   UPC exact      -> 1.0  (gold)
 *   model exact    -> 0.95 (strong)
 *   else fuzzy name similarity, with a price-sanity penalty for >3x / <0.33x gaps
 *   (accessory / bundle / wrong-variant guard).
 */
export function scoreCandidate(q: SearchQuery, c: Candidate): number {
  if (q.upc && c.upc && normalize(q.upc) === normalize(c.upc)) return 1.0;
  if (q.modelNumber && c.modelNumber && normalize(q.modelNumber) === normalize(c.modelNumber)) {
    return 0.95;
  }
  let score = compareTwoStrings(
    `${q.brand ?? ""} ${q.name}`.toLowerCase().trim(),
    `${c.brand ?? ""} ${c.title}`.toLowerCase().trim(),
  );
  if (q.sourcePrice != null && q.sourcePrice > 0 && c.price != null && c.price > 0) {
    const ratio = c.price / q.sourcePrice;
    if (ratio < 0.33 || ratio > 3) score *= 0.5;
  }
  return score;
}
