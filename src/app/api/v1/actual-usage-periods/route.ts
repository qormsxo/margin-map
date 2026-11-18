import { z } from "zod";
import { runApi, ok, okList } from "@/lib/api";
import {
  createActualUsagePeriod,
  listActualUsagePeriods,
} from "@/server/actual-usage-service";

export const runtime = "nodejs";

const createSchema = z
  .object({
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    alignedSalesPeriodId: z.string().min(1).optional(),
    note: z.string().optional(),
  })
  .strict();

export async function GET() {
  return runApi(async () => okList(await listActualUsagePeriods()));
}

export async function POST(request: Request) {
  return runApi(async () => {
    const body = createSchema.parse(await request.json());

    return ok(await createActualUsagePeriod(body), { status: 201 });
  });
}
