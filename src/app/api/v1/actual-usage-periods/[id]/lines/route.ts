import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { replaceActualUsageLines } from "@/server/actual-usage-service";

export const runtime = "nodejs";

const putSchema = z
  .object({
    lines: z.array(
      z
        .object({
          ingredientId: z.string().min(1),
          actualQty: z.number().nonnegative().optional(),
          actualCost: z.number().nonnegative().optional(),
          unit: z.enum(["G", "ML", "EA"]).optional(),
        })
        .refine(
          (line) =>
            line.actualQty !== undefined || line.actualCost !== undefined,
          { message: "actualQty 또는 actualCost가 필요합니다." },
        ),
    ),
    source: z.enum(["MANUAL", "CSV_IMPORT"]),
  })
  .strict();

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = putSchema.parse(await request.json());

    return ok(await replaceActualUsageLines(id, body));
  });
}
