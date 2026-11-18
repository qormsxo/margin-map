import { runApi, ok } from "@/lib/api";
import { getIntegratedDashboard } from "@/server/dashboard-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runApi(async () => {
    const channelId =
      new URL(request.url).searchParams.get("channelId") ?? undefined;

    const dash = await getIntegratedDashboard({ channelId });

    return ok(dash.sections.profitability);
  });
}
