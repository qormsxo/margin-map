import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { runVarianceAnalysis } from "@/server/variance-service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    actualUsagePeriodId: z.string().min(1),
    salesPeriodId: z.string().min(1),
    channelId: z.string().min(1).optional(),
    asOfAt: z.string().datetime().optional(),
  })
  .strict();

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await runVarianceAnalysis(body));
  });
}
