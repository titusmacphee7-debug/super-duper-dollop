import { z } from "zod";
import { handle, ok } from "@/lib/core/http";
import { searchByName } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ query: z.string().min(1, "a search term is required") });

// POST /api/wishlist/search  { query } -> { item, listings, errors }  (name/keyword search)
export async function POST(req: Request) {
  return handle(async () => {
    const { query } = Body.parse(await req.json());
    return ok(await searchByName(query));
  });
}
