import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { putMenuLines } from "@/server/menu-service";

export const runtime = "nodejs";

const lineSchema = z.union([
  z.object({
    ingredientId: z.string().min(1),
    qty: z.number().positive(),
    unit: z.enum(["G", "ML", "EA"]),
  }),
  z.object({
    componentPrepId: z.string().min(1),
    qty: z.number().positive(),
    unit: z.enum(["G", "ML", "EA"]),
  }),
]);

const bodySchema = z.object({
  lines: z.array(lineSchema),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());

    return ok(await putMenuLines(id, body.lines));
  });
}
