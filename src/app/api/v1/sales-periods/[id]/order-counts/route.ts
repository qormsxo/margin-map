import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { replaceOrderCounts } from "@/server/sales-period-service";

export const runtime = "nodejs";

const putSchema = z
  .object({
    counts: z.array(
      z.object({
        salesChannelId: z.string().min(1),
        orderCount: z.number().int().nonnegative(),
      }),
    ),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = putSchema.parse(await request.json());

    return ok(await replaceOrderCounts(id, body));
  });
}
