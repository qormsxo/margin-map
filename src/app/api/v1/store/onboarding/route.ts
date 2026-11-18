import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { completeOnboarding } from "@/server/store-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  businessType: z.string().min(1),
  channels: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await completeOnboarding(body));
  });
}
