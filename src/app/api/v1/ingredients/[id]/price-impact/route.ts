import { runApi, ok } from "@/lib/api";
import { getIngredientPriceImpact } from "@/server/price-impact-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    const historyId =
      new URL(request.url).searchParams.get("historyId") ?? undefined;

    return ok(await getIngredientPriceImpact(id, historyId));
  });
}
