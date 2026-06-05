import { handle, ok } from "@/lib/core/http";
import { refreshItem } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/items/[id]/refresh -> re-run the pricing engine for this Item
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => ok(await refreshItem(params.id)));
}
