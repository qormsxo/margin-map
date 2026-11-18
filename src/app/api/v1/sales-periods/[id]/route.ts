import { runApi, ok } from "@/lib/api";
import { getSalesPeriod } from "@/server/sales-period-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await getSalesPeriod(id));
  });
}
