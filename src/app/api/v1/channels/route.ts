import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import { createChannel, listChannels } from "@/server/channel-service";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  channelFeeRate: z.number().min(0).max(1),
  paymentFeeRate: z.number().min(0).max(1),
  deliveryFeeRate: z.number().min(0).max(1),
  deliveryFeeFixed: z.number().nonnegative(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  return runApi(async () => {
    return okList(await listChannels());
  });
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createChannel(body), { status: 201 });
  });
}
