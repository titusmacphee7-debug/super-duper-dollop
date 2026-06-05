import { z } from "zod";
import { handle, ok } from "@/lib/core/http";
import { scrapeToItem } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ url: z.string().url("a valid product URL is required") });

// POST /api/wishlist/scrape  { url } -> Item + RetailerListing[] (source listing)
export async function POST(req: Request) {
  return handle(async () => {
    const { url } = Body.parse(await req.json());
    const result = await scrapeToItem(url);
    return ok({
      item: result.item,
      listings: result.listings,
      missingFields: result.missingFields,
    });
  });
}
