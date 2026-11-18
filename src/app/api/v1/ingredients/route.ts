import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import {
  createIngredient,
  listIngredients,
} from "@/server/ingredient-service";

export const runtime = "nodejs";

const createSchema = z
  .object({
    name: z.string().min(1),
    baseUnit: z.enum(["G", "ML", "EA"]),
    purchaseQty: z.number().positive(),
    purchaseUnit: z.enum(["G", "ML", "EA", "KG", "L"]).optional(),
    purchasePrice: z.number().nonnegative(),
    taxType: z.enum(["TAXABLE", "EXEMPT"]),
    yieldRate: z.number().gt(0).max(1).optional(),
    notes: z.string().optional(),
  })
  .strict();

export async function GET() {
  return runApi(async () => {
    const data = await listIngredients();

    return okList(data);
  });
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());
    const data = await createIngredient(body);

    return ok(data, { status: 201 });
  });
}
