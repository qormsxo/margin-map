import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import {
  deleteIngredient,
  getIngredient,
  updateIngredient,
} from "@/server/ingredient-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  baseUnit: z.enum(["G", "ML", "EA"]).optional(),
  purchaseQty: z.number().positive().optional(),
  purchaseUnit: z.enum(["G", "ML", "EA", "KG", "L"]).optional(),
  purchasePrice: z.number().nonnegative().optional(),
  taxType: z.enum(["TAXABLE", "EXEMPT"]).optional(),
  yieldRate: z.number().gt(0).max(1).optional(),
  notes: z.string().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await getIngredient(id));
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    return ok(await updateIngredient(id, body));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await deleteIngredient(id));
  });
}
