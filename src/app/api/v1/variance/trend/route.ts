import { runApi, okList } from "@/lib/api";
import { getVarianceTrend } from "@/server/variance-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runApi(async () => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;

    return okList(await getVarianceTrend({ from, to }));
  });
}
