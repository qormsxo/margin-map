import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { requiredPricePreview } from "@/server/simulation-service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    menuItemId: z.string().min(1),
    channelId: z.string().min(1),
    targetContributionMargin: z.number().min(0).max(1),
    ingredientCostOverride: z.number().nonnegative().optional(),
  })
  .strict();

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await requiredPricePreview(body));
  });
}
