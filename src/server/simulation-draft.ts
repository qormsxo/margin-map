import { z } from "zod";
import type { SimulationOverrides } from "@/domain";

export const simulationDraftSchema = z
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

export type SimulationDraft = {
  channelId: string;
  menuIds?: string[];
  overrides: SimulationOverrides;
};

export function isSimulationDraft(value: unknown): value is SimulationDraft {
  return simulationDraftSchema.safeParse(value).success;
}
