import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { getCurrentStore, updateCurrentStore } from "@/server/store-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  return runApi(async () => {
    const store = await getCurrentStore();

    return ok({
      id: store.id,
      name: store.name,
      currency: store.currency,
      businessType: store.businessType,
    });
  });
}

export async function PATCH(request: Request) {
  return runApi(async () => {
    const json = await request.json();
    const body = patchSchema.parse(json);
    const store = await updateCurrentStore(body);

    return ok({
      id: store.id,
      name: store.name,
      currency: store.currency,
      businessType: store.businessType,
    });
  });
}
