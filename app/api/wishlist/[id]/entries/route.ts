import { z } from "zod";
import { requireUser } from "@/lib/core/auth";
import { handle, ok } from "@/lib/core/http";
import { addEntry } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  itemId: z.string().min(1, "itemId is required"),
  preferredRetailerId: z.string().optional(),
  priceAtSave: z.number().optional(),
  note: z.string().optional(),
});

// POST /api/wishlist/[id]/entries  { itemId, preferredRetailerId?, priceAtSave? } -> WishlistEntry
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const user = await requireUser();
    const input = Body.parse(await req.json());
    return ok(await addEntry(user.id, params.id, input), { status: 201 });
  });
}
