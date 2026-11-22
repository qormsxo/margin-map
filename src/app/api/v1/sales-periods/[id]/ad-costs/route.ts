import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { replaceAdCosts } from "@/server/sales-period-service";

export const runtime = "nodejs";

const putSchema = z
  .object({
    costs: z
      .array(
        z.object({
          salesChannelId: z.string().min(1).max(64),
          adSpend: z.number().nonnegative().max(1_000_000_000),
          adRate: z.number().min(0).max(1),
        }),
      )
      .max(50),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = putSchema.parse(await request.json());

    return ok(await replaceAdCosts(id, body));
  });
}
