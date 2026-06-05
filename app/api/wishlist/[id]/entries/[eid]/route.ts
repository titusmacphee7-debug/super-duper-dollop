import { requireUser } from "@/lib/core/auth";
import { handle, ok } from "@/lib/core/http";
import { removeEntry } from "@/lib/modules/wishlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/wishlist/[id]/entries/[eid]
export async function DELETE(_req: Request, { params }: { params: { id: string; eid: string } }) {
  return handle(async () => {
    const user = await requireUser();
    await removeEntry(user.id, params.id, params.eid);
    return ok({ ok: true });
  });
}
