import { runApi, ok } from "@/lib/api";
import { getDashboardAlerts } from "@/server/alert-service";

export const runtime = "nodejs";

export async function GET() {
  return runApi(async () => ok(await getDashboardAlerts()));
}
