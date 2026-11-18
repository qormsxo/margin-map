import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import { createMenu, listMenus } from "@/server/menu-service";

export const runtime = "nodejs";

const createSchema = z
  .object({
    name: z.string().min(1),
    sellingPrice: z.number().nonnegative(),
    vatInclusive: z.boolean().optional(),
    defaultChannelId: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  return runApi(async () => {
    return okList(await listMenus());
  });
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createMenu(body), { status: 201 });
  });
}
