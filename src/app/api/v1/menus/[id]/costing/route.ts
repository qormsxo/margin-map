import { runApi, ok } from "@/lib/api";
import { getMenuCosting } from "@/server/costing-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const channelId = new URL(request.url).searchParams.get("channelId") ?? undefined;

    return ok(await getMenuCosting(id, channelId));
  });
}
