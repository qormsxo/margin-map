import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { registerUser } from "@/server/auth-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  storeName: z.string().min(1),
  organizationName: z.string().optional(),
});

export async function POST(request: Request) {
  return runApi(async () => {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const data = await registerUser(body);

    return ok(data, { status: 201 });
  });
}
