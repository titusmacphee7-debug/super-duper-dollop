import { describe, it, expect } from "vitest";
import { parseMoney, formatMoney } from "@/lib/core/money";

describe("parseMoney — separators", () => {
  it("parses plain US prices", () => {
    expect(parseMoney("$49.99")?.amount).toBe(49.99);
    expect(parseMoney("USD 1299")?.amount).toBe(1299);
    expect(parseMoney("$0.99")?.amount).toBe(0.99);
  });

  it("treats a grouped integer as thousands, not a decimal (regression: $1,299 must not be $1.30)", () => {
    expect(parseMoney("$1,299")?.amount).toBe(1299);
    expect(parseMoney("$1,200")?.amount).toBe(1200);
    expect(parseMoney("1.299")?.amount).toBe(1299);
    expect(parseMoney("1,234,567")?.amount).toBe(1234567);
  });

  it("parses thousands + decimals in US and EU notation", () => {
    expect(parseMoney("$1,299.00")?.amount).toBe(1299);
    expect(parseMoney("1.299,50 €")?.amount).toBe(1299.5);
  });

  it("parses short separators as decimals", () => {
    expect(parseMoney("12,99")?.amount).toBe(12.99); // EU decimal comma
    expect(parseMoney("1.5")?.amount).toBe(1.5);
  });
});

describe("parseMoney — currency + guards", () => {
  it("detects currency from symbol, code, or fallback", () => {
    expect(parseMoney("£100")?.currency).toBe("GBP");
    expect(parseMoney("CAD 50")?.currency).toBe("CAD");
    expect(parseMoney("100", "EUR")?.currency).toBe("EUR");
  });

  it("returns null when there is no number", () => {
    expect(parseMoney("call for price")).toBeNull();
    expect(parseMoney("")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats with the currency symbol", () => {
    expect(formatMoney({ amount: 99, currency: "USD" })).toBe("$99.00");
  });

  it("falls back gracefully on an unknown currency code", () => {
    expect(formatMoney({ amount: 5, currency: "XYZ" })).toContain("5");
  });
});
