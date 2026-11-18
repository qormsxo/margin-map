import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/domain";
import { AppError } from "@/lib/errors";
import { fromDomainError } from "@/lib/domain-map";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function okList<T>(data: T[], total = data.length, init?: ResponseInit) {
  return NextResponse.json({ data, meta: { total } }, init);
}

export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

export function isCatchableError(
  error: unknown,
): error is AppError | ZodError | DomainError | Error {
  return (
    error instanceof AppError ||
    error instanceof ZodError ||
    error instanceof DomainError ||
    error instanceof Error
  );
}

export function fail(error: AppError | ZodError | DomainError | Error) {
  if (error instanceof DomainError) {
    return fail(fromDomainError(error));
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? [],
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "요청 값이 올바르지 않습니다.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "서버 오류가 발생했습니다.",
        details: [],
      },
    },
    { status: 500 },
  );
}

/** Run a route handler and map thrown errors to JSON responses. */
export async function runApi(
  work: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await work();
  } catch (error) {
    if (isCatchableError(error)) {
      return fail(error);
    }

    console.error(error);

    return fail(
      new AppError("INTERNAL_ERROR", "서버 오류가 발생했습니다.", 500),
    );
  }
}
