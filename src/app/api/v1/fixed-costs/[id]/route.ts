import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { deleteFixedCost, updateFixedCost } from "@/server/fixed-cost-service";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    category: z.enum(["LABOR", "RENT", "UTILITIES", "OTHER"]).optional(),
    monthlyAmount: z.number().nonnegative().optional(),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    return ok(await updateFixedCost(id, body));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await deleteFixedCost(id));
  });
}
