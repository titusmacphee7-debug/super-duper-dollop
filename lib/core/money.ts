/**
 * Money utilities. Hard rule (AGENTS.md): prices flow through here — never raw
 * float math in the UI. Store a numeric value + an ISO currency code separately;
 * convert/format only at display time.
 */
export interface Money {
  amount: number; // numeric value in the currency's major unit
  currency: string; // ISO 4217, e.g. "USD"
}

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  $: "USD",
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
  "₹": "INR",
};

const CODE_RE = /\b(USD|CAD|AUD|EUR|GBP|JPY|INR|MXN)\b/i;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Parse a price string ("$1,299.00", "USD 49.99", "1.299,00 €") into Money.
 * Returns null when no numeric value is present rather than throwing.
 */
export function parseMoney(input: string | number, fallbackCurrency = "USD"): Money | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? { amount: round2(input), currency: fallbackCurrency } : null;
  }

  let currency = fallbackCurrency;
  const code = input.match(CODE_RE);
  if (code) {
    currency = code[1].toUpperCase();
  } else {
    for (const [sym, cur] of Object.entries(SYMBOL_TO_CURRENCY)) {
      if (input.includes(sym)) {
        currency = cur;
        break;
      }
    }
  }

  // Keep digits and separators; strip everything else.
  let numeric = input.replace(/[^0-9.,]/g, "");
  if (!numeric) return null;

  const hasComma = numeric.includes(",");
  const hasDot = numeric.includes(".");
  if (hasComma && hasDot) {
    // Both present: the rightmost separator is the decimal point; the other groups thousands.
    if (numeric.lastIndexOf(",") > numeric.lastIndexOf(".")) {
      numeric = numeric.replace(/\./g, "").replace(",", ".");
    } else {
      numeric = numeric.replace(/,/g, "");
    }
  } else if (hasComma || hasDot) {
    // One kind of separator. Repeated separators ("1,234,567"), or a single separator with a
    // leading group and exactly 3 trailing digits ("1,299" / "1.299"), is a THOUSANDS separator;
    // otherwise it's a decimal point ("12,99", "1.50", ".99"). This stops "$1,299" -> $1.30.
    const sep = hasComma ? "," : ".";
    const parts = numeric.split(sep);
    const last = parts[parts.length - 1];
    const grouping =
      parts.length > 2 || (parts.length === 2 && parts[0].length >= 1 && last.length === 3);
    numeric = grouping ? parts.join("") : numeric.replace(sep, ".");
  }

  const amount = Number.parseFloat(numeric);
  return Number.isFinite(amount) ? { amount: round2(amount), currency } : null;
}

export function formatMoney(money: Money, locale = "en-US"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: money.currency }).format(
      money.amount,
    );
  } catch {
    return `${money.amount.toFixed(2)} ${money.currency}`;
  }
}
