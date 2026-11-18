import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import {
  createSimulationScenario,
  listSimulationScenarios,
} from "@/server/simulation-service";

export const runtime = "nodejs";

const draftSchema = z
  .object({
    channelId: z.string().min(1),
    menuIds: z.array(z.string().min(1)).optional(),
    overrides: z
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
      .default({}),
  })
  .strict();

const createSchema = z
  .object({
    name: z.string().min(1),
    draft: draftSchema,
  })
  .strict();

export async function GET() {
  return runApi(async () => okList(await listSimulationScenarios()));
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createSimulationScenario(body), { status: 201 });
  });
}
