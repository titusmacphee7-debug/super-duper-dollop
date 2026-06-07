import * as cheerio from "cheerio";
import { parseMoney } from "@/lib/core/money";
import type { Candidate, SearchQuery } from "../types";
import type { Fetcher } from "../fetcher";
import { precisionQuery, type RetailerAdapter } from "./types";

const RETAILER = "Amazon";

export const amazonAdapter: RetailerAdapter = {
  retailer: RETAILER,
  matchesUrl: (url) => /(^|\.)amazon\./i.test(safeHost(url)),
  cssSelectors: {
    name: "#productTitle",
    price: "#corePrice_feature_div .a-offscreen, .a-price .a-offscreen",
    brand: "#bylineInfo",
    image: "#landingImage",
    availability: "#availability",
  },
  async search(query: SearchQuery, fetcher: Fetcher): Promise<Candidate[]> {
    // Prefer the official Product Advertising API when configured.
    if (process.env.AMAZON_PAAPI_KEY) {
      // TODO(api): implement PA-API 5.0 SearchItems (preferred over scraping).
    }
    try {
      const term = encodeURIComponent(precisionQuery(query));
      const { html } = await fetcher.fetchHtml(`https://www.amazon.com/s?k=${term}`);
      const $ = cheerio.load(html);
      const out: Candidate[] = [];
      $("div[data-component-type='s-search-result']").each((_i, el) => {
        if (out.length >= 10) return;
        try {
          const card = $(el);
          const title = card.find("h2 a span").first().text().trim();
          const href = card.find("h2 a").attr("href");
          const priceStr = card.find(".a-price .a-offscreen").first().text().trim();
          if (!title || !href) return;
          const money = priceStr ? parseMoney(priceStr) : null;
          out.push({
            retailer: RETAILER,
            title,
            price: money?.amount ?? null,
            currency: money?.currency ?? null,
            url: new URL(href, "https://www.amazon.com").toString(),
            imageUrl: card.find("img.s-image").attr("src") ?? null,
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
