import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { deleteMenu, getMenu, updateMenu } from "@/server/menu-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sellingPrice: z.number().nonnegative().optional(),
  vatInclusive: z.boolean().optional(),
  defaultChannelId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await getMenu(id));
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    return ok(await updateMenu(id, body));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await deleteMenu(id));
  });
}
