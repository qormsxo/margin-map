import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import { createPrepRecipe, listPrepRecipes } from "@/server/prep-service";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  yieldQty: z.number().positive(),
  yieldUnit: z.enum(["G", "ML", "EA"]),
});

export async function GET() {
  return runApi(async () => {
    return okList(await listPrepRecipes());
  });
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createPrepRecipe(body), { status: 201 });
  });
}
