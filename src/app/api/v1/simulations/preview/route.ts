import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { previewMenuSimulation } from "@/server/simulation-service";

export const runtime = "nodejs";

const overridesSchema = z
  .object({
    menuPrices: z.record(z.string(), z.number().nonnegative()).optional(),
    ingredientUnitCosts: z
      .record(z.string(), z.number().nonnegative())
      .optional(),
    channelFees: z
      .object({
        channelFeeRate: z.number().min(0).max(1).optional(),
        paymentFeeRate: z.number().min(0).max(1).optional(),
        deliveryFeeRate: z.number().min(0).max(1).optional(),
        deliveryFeeFixed: z.number().nonnegative().optional(),
      })
      .optional(),
  })
  .strict();

const bodySchema = z
  .object({
    channelId: z.string().min(1),
    menuIds: z.array(z.string().min(1)).optional(),
    overrides: overridesSchema.default({}),
  })
  .strict();

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await previewMenuSimulation(body));
  });
}
