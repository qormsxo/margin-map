import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import {
  deletePrepRecipe,
  updatePrepRecipe,
} from "@/server/prep-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  yieldQty: z.number().positive().optional(),
  yieldUnit: z.enum(["G", "ML", "EA"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    return ok(await updatePrepRecipe(id, body));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await deletePrepRecipe(id));
  });
}
