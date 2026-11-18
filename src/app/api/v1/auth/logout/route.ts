import { runApi, ok } from "@/lib/api";
import { logoutUser } from "@/server/auth-service";

export const runtime = "nodejs";

export async function POST() {
  return runApi(async () => {
    await logoutUser();

    return ok({ success: true });
  });
}
