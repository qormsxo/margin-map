import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { loginUser } from "@/server/auth-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  return runApi(async () => {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const data = await loginUser(body);

    return ok(data);
  });
}
