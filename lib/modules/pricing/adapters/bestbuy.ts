import * as cheerio from "cheerio";
import { parseMoney } from "@/lib/core/money";
import type { Candidate, SearchQuery } from "../types";
import type { Fetcher } from "../fetcher";
import { precisionQuery, type RetailerAdapter } from "./types";

const RETAILER = "Best Buy";

export const bestBuyAdapter: RetailerAdapter = {
  retailer: RETAILER,
  matchesUrl: (url) => /(^|\.)bestbuy\./i.test(safeHost(url)),
  cssSelectors: {
    name: ".sku-title h1, h1.heading-5",
    price: ".priceView-customer-price span, [data-testid='customer-price']",
    brand: ".product-data-value",
    image: ".primary-image",
    availability: ".fulfillment-add-to-cart-button",
  },
  async search(query: SearchQuery, fetcher: Fetcher): Promise<Candidate[]> {
    if (process.env.BESTBUY_API_KEY) {
      // TODO(api): implement Best Buy Products API search (preferred over scraping).
    }
    try {
      const term = encodeURIComponent(precisionQuery(query));
      const { html } = await fetcher.fetchHtml(`https://www.bestbuy.com/site/searchpage.jsp?st=${term}`);
      const $ = cheerio.load(html);
      const out: Candidate[] = [];
      $("li.sku-item").each((_i, el) => {
        if (out.length >= 10) return;
        try {
          const card = $(el);
          const link = card.find("h4.sku-title a, .sku-title a").first();
          const title = link.text().trim();
          const href = link.attr("href");
          const priceStr = card.find(".priceView-customer-price span").first().text().trim();
          if (!title || !href) return;
          const money = priceStr ? parseMoney(priceStr) : null;
          out.push({
            retailer: RETAILER,
            title,
            modelNumber: card.find(".sku-model .sku-value").first().text().trim() || null,
            price: money?.amount ?? null,
            currency: money?.currency ?? null,
            url: new URL(href, "https://www.bestbuy.com").toString(),
            imageUrl: card.find("img.product-image").attr("src") ?? null,
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
