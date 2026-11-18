import { runApi, ok } from "@/lib/api";
import { getIntegratedDashboard } from "@/server/dashboard-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runApi(async () => {
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId") ?? undefined;
    const salesPeriodId = url.searchParams.get("salesPeriodId") ?? undefined;

    return ok(await getIntegratedDashboard({ channelId, salesPeriodId }));
  });
}
