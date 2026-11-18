import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { createFixedCost, listFixedCosts } from "@/server/fixed-cost-service";

export const runtime = "nodejs";

const createSchema = z
  .object({
    name: z.string().min(1),
    category: z.enum(["LABOR", "RENT", "UTILITIES", "OTHER"]),
    monthlyAmount: z.number().nonnegative(),
  })
  .strict();

export async function GET() {
  return runApi(async () => ok(await listFixedCosts()));
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createFixedCost(body), { status: 201 });
  });
}
