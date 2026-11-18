import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import { createPurchase, listPurchases } from "@/server/purchase-service";

export const runtime = "nodejs";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z
  .object({
    purchasedOn: isoDate,
    amount: z.number().nonnegative(),
    supplier: z.string().max(100).optional(),
    note: z.string().max(500).optional(),
  })
  .strict();

export async function GET(request: Request) {
  return runApi(async () => {
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;

    if (from) isoDate.parse(from);

    if (to) isoDate.parse(to);

    return okList(await listPurchases({ from, to }));
  });
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createPurchase(body), { status: 201 });
  });
}
