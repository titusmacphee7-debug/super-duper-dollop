import { z } from "zod";
import { requireUser } from "@/lib/core/auth";
import { handle, ok } from "@/lib/core/http";
import { createWishlist, listWishlists } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/wishlist -> user's wishlists with entries
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({ wishlists: await listWishlists(user.id) });
  });
}

const CreateBody = z.object({ name: z.string().min(1, "name is required") });

// POST /api/wishlist  { name } -> Wishlist
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { name } = CreateBody.parse(await req.json());
    return ok(await createWishlist(user.id, name), { status: 201 });
  });
}
