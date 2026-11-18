import { runApi, ok } from "@/lib/api";
import { getMe } from "@/server/store-service";

export const runtime = "nodejs";

export async function GET() {
  return runApi(async () => {
    const data = await getMe();

    return ok(data);
  });
}
