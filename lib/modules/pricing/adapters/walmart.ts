import * as cheerio from "cheerio";
import { parseMoney } from "@/lib/core/money";
import type { Candidate, SearchQuery } from "../types";
import type { Fetcher } from "../fetcher";
import { precisionQuery, type RetailerAdapter } from "./types";

const RETAILER = "Walmart";

export const walmartAdapter: RetailerAdapter = {
  retailer: RETAILER,
  matchesUrl: (url) => /(^|\.)walmart\./i.test(safeHost(url)),
  cssSelectors: {
    name: "h1[itemprop='name'], #main-title",
    price: "span[itemprop='price'], [data-automation-id='product-price']",
    brand: "a[data-seo-id='brand-name']",
    image: "img[data-testid='hero-image']",
    availability: "[data-automation-id='atc']",
  },
  async search(query: SearchQuery, fetcher: Fetcher): Promise<Candidate[]> {
    if (process.env.WALMART_API_KEY) {
      // TODO(api): implement Walmart Affiliate/Marketplace search (preferred over scraping).
    }
    try {
      const term = encodeURIComponent(precisionQuery(query));
      const { html } = await fetcher.fetchHtml(`https://www.walmart.com/search?q=${term}`);
      const $ = cheerio.load(html);
      const out: Candidate[] = [];
      $("div[data-item-id]").each((_i, el) => {
        if (out.length >= 10) return;
        try {
          const card = $(el);
          const title = card.find("span[data-automation-id='product-title']").first().text().trim();
          const href = card.find("a[link-identifier]").attr("href") ?? card.find("a").attr("href");
          const priceStr = card.find("div[data-automation-id='product-price']").first().text().trim();
          if (!title || !href) return;
          const money = priceStr ? parseMoney(priceStr) : null;
          out.push({
            retailer: RETAILER,
            title,
            price: money?.amount ?? null,
            currency: money?.currency ?? null,
            url: new URL(href, "https://www.walmart.com").toString(),
            imageUrl: card.find("img").attr("src") ?? null,
            inStock: true,
            condition: "new",
          });
        } catch {
          // Skip one malformed card (e.g. a bad href) rather than dropping every candidate.
        }
      });
      return out;
    } catch {
      return [];
    }
  },
};

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
