import { runApi, okList } from "@/lib/api";
import { listIngredientPriceHistory } from "@/server/price-impact-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const data = await listIngredientPriceHistory(id);

    return okList(data);
  });
}
