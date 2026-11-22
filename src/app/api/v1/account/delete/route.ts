import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { deleteAccount } from "@/server/account-service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    password: z.string().min(1).max(200),
    storeName: z.string().min(1).max(200),
  })
  .strict();

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await deleteAccount(body));
  });
}
