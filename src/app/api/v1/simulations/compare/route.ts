import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { compareSimulationScenarios } from "@/server/simulation-service";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    scenarioIds: z.array(z.string().min(1)).min(2),
  })
  .strict();

export async function POST(request: Request) {
  return runApi(async () => {
    const body = bodySchema.parse(await request.json());

    return ok(await compareSimulationScenarios(body.scenarioIds));
  });
}
