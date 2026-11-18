import { runApi, ok } from "@/lib/api";
import { validationError } from "@/lib/errors";
import { getContributionAnalysis } from "@/server/contribution-analysis-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return runApi(async () => {
    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");
    const channelId = url.searchParams.get("channelId") ?? undefined;

    if (!periodId) {
      throw validationError("periodId 쿼리가 필요합니다.");
    }

    return ok(await getContributionAnalysis({ periodId, channelId }));
  });
}
