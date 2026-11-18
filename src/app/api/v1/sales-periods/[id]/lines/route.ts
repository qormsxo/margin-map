import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { replaceSalesLines } from "@/server/sales-period-service";

export const runtime = "nodejs";

const putSchema = z
  .object({
    lines: z.array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().positive(),
        salesChannelId: z.string().min(1).optional(),
      }),
    ),
    source: z.enum(["MANUAL", "CSV_IMPORT"]),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = putSchema.parse(await request.json());

    return ok(await replaceSalesLines(id, body));
  });
}
