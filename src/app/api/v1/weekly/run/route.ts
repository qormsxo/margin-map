import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { runWeeklyAnomalyCheck } from "@/server/weekly-service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    channelId: z.string().min(1).optional(),
  })
  .strict();

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await runWeeklyAnomalyCheck(body));
  });
}
