import { runApi, ok } from "@/lib/api";
import { deletePurchase } from "@/server/purchase-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await deletePurchase(id));
  });
}
