import { runApi, ok } from "@/lib/api";
import { getActualUsagePeriod } from "@/server/actual-usage-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await getActualUsagePeriod(id));
  });
}
