import { z } from "zod";
import { runApi, ok } from "@/lib/api";
import { validationError } from "@/lib/errors";
import { getPurchaseVariance } from "@/server/purchase-service";

export const runtime = "nodejs";

const moneyParam = z.coerce.number().nonnegative();

export async function GET(request: Request) {
  return runApi(async () => {
    const url = new URL(request.url);
    const periodId = url.searchParams.get("periodId");

    if (!periodId) throw validationError("periodId 쿼리가 필요합니다.");

    const openingRaw = url.searchParams.get("openingInventory");
    const closingRaw = url.searchParams.get("closingInventory");

    return ok(
      await getPurchaseVariance({
        periodId,
        openingInventory: openingRaw ? moneyParam.parse(openingRaw) : null,
        closingInventory: closingRaw ? moneyParam.parse(closingRaw) : null,
      }),
    );
  });
}
