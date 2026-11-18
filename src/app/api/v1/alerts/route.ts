import { runApi, okList } from "@/lib/api";
import { listAlerts } from "@/server/alert-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runApi(async () => {
    const raw = new URL(request.url).searchParams.get("acknowledged");

    const acknowledged =
      raw === "false" ? false : raw === "true" ? true : undefined;

    return okList(await listAlerts({ acknowledged }));
  });
}
