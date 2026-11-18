import { runApi, ok } from "@/lib/api";
import { acknowledgeAlert } from "@/server/alert-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await acknowledgeAlert(id));
  });
}
