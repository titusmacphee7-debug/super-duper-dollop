import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { scrapeProduct } from "./scraper";
import { searchAllRetailers } from "./search";
import type { SearchQuery } from "./types";

/**
 * Scraping/searching runs OFF the request path in a BullMQ worker (per the brief:
 * pooled browser, restart-every-N, no network in the API handler). The API can
 * enqueue jobs and the client polls; the synchronous service path also exists for
 * the simple single-user flow.
 */
export const SCRAPE_QUEUE = "pricing:scrape";

interface ScrapeJob {
  type: "scrape";
  url: string;
}
interface SearchJob {
  type: "search";
  query: SearchQuery;
}
type PricingJob = ScrapeJob | SearchJob;

function connection(): IORedis {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
}

let queue: Queue<PricingJob> | null = null;
export function pricingQueue(): Queue<PricingJob> {
  return (queue ??= new Queue<PricingJob>(SCRAPE_QUEUE, { connection: connection() }));
}

export async function enqueueScrape(url: string): Promise<void> {
  await pricingQueue().add("scrape", { type: "scrape", url });
}

export function startPricingWorker(): Worker<PricingJob> {
  const worker = new Worker<PricingJob>(
    SCRAPE_QUEUE,
    async (job: Job<PricingJob>) => {
      if (job.data.type === "scrape") return scrapeProduct(job.data.url);
      return searchAllRetailers(job.data.query);
    },
    { connection: connection(), concurrency: 2 },
  );
  worker.on("failed", (job, err) => console.error("[pricing worker] job failed", job?.id, err));
  return worker;
}

// Standalone entry: `pnpm worker`.
if (process.argv[1] && /worker\.(ts|js)$/.test(process.argv[1])) {
  startPricingWorker();
  // eslint-disable-next-line no-console
  console.log("[pricing worker] listening on", SCRAPE_QUEUE);
}
