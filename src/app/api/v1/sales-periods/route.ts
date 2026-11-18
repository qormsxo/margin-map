import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import {
  createSalesPeriod,
  listSalesPeriods,
} from "@/server/sales-period-service";

export const runtime = "nodejs";

const createSchema = z
  .object({
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    grain: z.enum(["DAY", "WEEK", "MONTH", "CUSTOM"]),
  })
  .strict();

export async function GET() {
  return runApi(async () => okList(await listSalesPeriods()));
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createSalesPeriod(body), { status: 201 });
  });
}
