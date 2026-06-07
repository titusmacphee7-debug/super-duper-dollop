/**
 * The ONLY code that touches the network. Everything else (adapters, extractors)
 * gets HTML from here, so swapping proxy providers is a one-line change.
 */
export interface FetchResult {
  html: string;
  status: number;
  url: string;
}

export interface Fetcher {
  fetchHtml(url: string): Promise<FetchResult>;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const NAV_TIMEOUT_MS = 15_000;

async function rawFetch(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal, redirect: "follow" });
    const html = await res.text();
    return { html, status: res.status, url: res.url || url };
  } finally {
    clearTimeout(timer);
  }
}

/** Direct fetch — no proxy. Logs a one-time TODO so prod doesn't silently run unproxied. */
class DirectFetcher implements Fetcher {
  private warned = false;
  async fetchHtml(url: string): Promise<FetchResult> {
    if (!this.warned) {
      this.warned = true;
      console.warn(
        "[pricing] TODO: no SCRAPER_PROVIDER set — fetching directly without a residential proxy. " +
          "Retailers will rate-limit/block at volume. Set SCRAPER_PROVIDER + key for production.",
      );
    }
    return rawFetch(url);
  }
}

/** ScraperAPI — URL-based proxy that works with plain fetch (renders + rotates IPs). */
class ScraperApiFetcher implements Fetcher {
  constructor(private readonly apiKey: string) {}
  async fetchHtml(url: string): Promise<FetchResult> {
    const endpoint =
      `https://api.scraperapi.com/?api_key=${encodeURIComponent(this.apiKey)}` +
      `&render=true&country_code=us&url=${encodeURIComponent(url)}`;
    const res = await rawFetch(endpoint);
    return { ...res, url };
  }
}

let singleton: Fetcher | null = null;

/** Resolve the active fetcher from env. Falls back to direct fetch (with a logged TODO). */
export function getFetcher(): Fetcher {
  if (singleton) return singleton;
  const provider = (process.env.SCRAPER_PROVIDER ?? "").toLowerCase();
  if (provider === "scraperapi" && process.env.SCRAPERAPI_KEY) {
    singleton = new ScraperApiFetcher(process.env.SCRAPERAPI_KEY);
  } else {
    // brightdata / unconfigured both degrade to direct for now (interface stays put).
    singleton = new DirectFetcher();
  }
  return singleton;
}

const CAPTCHA_MARKERS = [/captcha/i, /are you a human/i, /unusual traffic/i, /robot check/i];

export function looksBlocked(result: FetchResult): boolean {
  // Anti-bot (403/429) and any 5xx/proxy error page must not be trusted or cached as a product.
  if (result.status === 403 || result.status === 429 || result.status >= 500) return true;
  return CAPTCHA_MARKERS.some((re) => re.test(result.html.slice(0, 4000)));
}
