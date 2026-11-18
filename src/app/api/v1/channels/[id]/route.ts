import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { deleteChannel, updateChannel } from "@/server/channel-service";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  channelFeeRate: z.number().min(0).max(1).optional(),
  paymentFeeRate: z.number().min(0).max(1).optional(),
  deliveryFeeRate: z.number().min(0).max(1).optional(),
  deliveryFeeFixed: z.number().nonnegative().optional(),
  isDefault: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    return ok(await updateChannel(id, body));
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;

    return ok(await deleteChannel(id));
  });
}
