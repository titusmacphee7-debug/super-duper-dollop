import { handle, ok } from "@/lib/core/http";
import { getItemWithListings } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/items/[id] -> Item + all RetailerListings
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => ok(await getItemWithListings(params.id)));
}
