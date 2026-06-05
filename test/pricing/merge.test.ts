import { describe, it, expect } from "vitest";
import { mergeIn, extractProduct, emptyProduct } from "@/lib/modules/pricing/extract";
import type { Product } from "@/lib/modules/pricing/types";

describe("mergeIn", () => {
  it("fills only null/absent fields — higher tier is never overwritten", () => {
    const target: Partial<Product> = { name: "First", brand: null, price: null };
    mergeIn(target, { name: "Second", brand: "DeWalt", price: 49 });
    expect(target.name).toBe("First"); // kept
    expect(target.brand).toBe("DeWalt"); // filled
    expect(target.price).toBe(49); // filled
  });

  it("ignores _missingFields and never copies null source values", () => {
    const target: Partial<Product> = { upc: null };
    mergeIn(target, { upc: null, _missingFields: ["x"] });
    expect(target.upc).toBeNull();
    expect(target._missingFields).toBeUndefined();
  });
});

describe("extractProduct waterfall precedence", () => {
  const adapter = { retailer: "Test", cssSelectors: { name: ".t", price: ".p" } };

  it("prefers JSON-LD over meta tags over CSS selectors", () => {
    const html = `<html><head>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "JsonLD Drill",
        brand: { name: "DeWalt" },
        mpn: "DCD771",
        image: "https://x/img.jpg",
        offers: {
          "@type": "Offer",
          price: "99.00",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      })}</script>
      <meta property="og:title" content="Meta Drill"/>
      <meta property="product:price:amount" content="120.00"/>
      </head><body><h1 class="t">Selector Drill</h1><span class="p">$130.00</span></body></html>`;

    const p = extractProduct(html, adapter);
    expect(p.name).toBe("JsonLD Drill");
    expect(p.brand).toBe("DeWalt");
    expect(p.modelNumber).toBe("DCD771");
    expect(p.price).toBe(99);
    expect(p.currency).toBe("USD");
    expect(p.inStock).toBe(true);
    expect(p.retailer).toBe("Test");
  });

  it("falls back to meta, then CSS, when higher tiers are absent", () => {
    const metaOnly = `<html><head>
      <meta property="og:title" content="Meta Drill"/>
      <meta property="product:price:amount" content="120.00"/>
      <meta property="product:price:currency" content="USD"/>
      </head><body><h1 class="t">Selector Drill</h1><span class="p">$130.00</span></body></html>`;
    const p1 = extractProduct(metaOnly, adapter);
    expect(p1.name).toBe("Meta Drill");
    expect(p1.price).toBe(120);

    const selectorOnly = `<html><body><h1 class="t">Selector Drill</h1><span class="p">$130.00</span></body></html>`;
    const p2 = extractProduct(selectorOnly, adapter);
    expect(p2.name).toBe("Selector Drill");
    expect(p2.price).toBe(130);
  });

  it("records missing fields instead of throwing", () => {
    const p = extractProduct("<html><body>nothing here</body></html>", adapter);
    const blank = emptyProduct();
    expect(p.name).toBe(blank.name); // null
    expect(p.price).toBe(blank.price); // null
    expect(p._missingFields).toContain("name");
    expect(p._missingFields).toContain("price");
    expect(p._missingFields).toContain("identity(upc|modelNumber)");
  });
});
