import { runApi, ok } from "@/lib/api";
import { validationError } from "@/lib/errors";
import { importSalesCsv } from "@/server/sales-import-service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  return runApi(async () => {
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";

    let csvText = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");

      if (!(file instanceof File)) {
        throw validationError("file 필드(CSV)가 필요합니다.");
      }

      csvText = await file.text();
    } else {
      csvText = await request.text();
    }

    if (!csvText.trim()) {
      throw validationError("CSV 내용이 비어 있습니다.");
    }

    return ok(await importSalesCsv(id, csvText));
  });
}
