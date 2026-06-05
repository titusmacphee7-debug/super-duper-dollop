import { describe, it, expect } from "vitest";
import { normalize, scoreCandidate, MATCH_THRESHOLD } from "@/lib/modules/pricing/matcher";
import type { Candidate, SearchQuery } from "@/lib/modules/pricing/types";

const baseCandidate = (over: Partial<Candidate>): Candidate => ({
  retailer: "Test",
  title: "Generic",
  price: 100,
  url: "https://example.com/p",
  ...over,
});

describe("normalize", () => {
  it("strips separators and uppercases", () => {
    expect(normalize("dcd-771 c2")).toBe("DCD771C2");
    expect(normalize("DCD771C2")).toBe("DCD771C2");
    expect(normalize("a.b/c")).toBe("ABC");
  });
});

describe("scoreCandidate", () => {
  const q: SearchQuery = {
    name: "DeWalt 20V MAX Cordless Drill",
    brand: "DeWalt",
    modelNumber: "DCD771C2",
    upc: "885911475938",
    sourcePrice: 99,
  };

  it("returns 1.0 (gold) on exact UPC match, formatting-insensitive", () => {
    const c = baseCandidate({ upc: "8859-1147 5938", title: "totally different title" });
    expect(scoreCandidate(q, c)).toBe(1.0);
  });

  it("returns 0.95 on exact model match when UPC is absent", () => {
    const noUpc: SearchQuery = { ...q, upc: null };
    const c = baseCandidate({ modelNumber: "dcd771c2", title: "unrelated" });
    expect(scoreCandidate(noUpc, c)).toBe(0.95);
  });

  it("falls back to fuzzy name similarity above threshold for close titles", () => {
    const nameOnly: SearchQuery = { name: "DeWalt 20V MAX Cordless Drill", brand: "DeWalt" };
    const c = baseCandidate({ title: "DeWalt 20V MAX Cordless Drill Kit", brand: "DeWalt" });
    const score = scoreCandidate(nameOnly, c);
    expect(score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    expect(score).toBeLessThan(1.0); // fuzzy, never the exact-match constants
  });

  it("applies the price-sanity penalty for >3x gaps (bundle/wrong item)", () => {
    const nameOnly: SearchQuery = { name: "DeWalt Drill", brand: "DeWalt", sourcePrice: 100 };
    const cheap = baseCandidate({ title: "DeWalt Drill", brand: "DeWalt", price: 100 });
    const bundle = baseCandidate({ title: "DeWalt Drill", brand: "DeWalt", price: 400 });
    expect(scoreCandidate(nameOnly, bundle)).toBeCloseTo(scoreCandidate(nameOnly, cheap) * 0.5, 5);
  });

  it("does not penalize prices within the sane band", () => {
    const nameOnly: SearchQuery = { name: "DeWalt Drill", brand: "DeWalt", sourcePrice: 100 };
    const within = baseCandidate({ title: "DeWalt Drill", brand: "DeWalt", price: 120 });
    const noPriceCtx: SearchQuery = { name: "DeWalt Drill", brand: "DeWalt" };
    expect(scoreCandidate(nameOnly, within)).toBeCloseTo(scoreCandidate(noPriceCtx, within), 5);
  });
});
