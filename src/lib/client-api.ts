import { z } from "zod";

export type ApiFail = {
  ok: false;
  status: number;
  message: string;
  code?: string;
};

export type ApiOk<T> = {
  ok: true;
  status: number;
  data: T;
};

export type ApiResult<T> = ApiOk<T> | ApiFail;

const apiEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  error: z
    .object({
      message: z.string().optional(),
      code: z.string().optional(),
    })
    .optional(),
});

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init?.headers);

    if (init?.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(path, {
      ...init,
      headers,
    });

    const rawText = await response.text();

    const parsed = rawText
      ? apiEnvelopeSchema.safeParse(JSON.parse(rawText))
      : ({ success: false } as const);

    const json = parsed.success ? parsed.data : {};

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          json.error?.message ??
          (response.status === 0
            ? "네트워크에 연결할 수 없습니다."
            : `요청 실패 (${response.status})`),
        code: json.error?.code,
      };
    }

    if (json.data === undefined) {
      return {
        ok: false,
        status: response.status,
        message: "응답 형식이 올바르지 않습니다.",
        code: "INVALID_RESPONSE",
      };
    }

    // SAFETY: server route Zod schemas already validated the payload shape for this path.
    const data = json.data as T;

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message:
        "네트워크에 연결할 수 없습니다. 연결을 확인한 뒤 다시 시도하세요.",
      code: "NETWORK_ERROR",
    };
  }
}
