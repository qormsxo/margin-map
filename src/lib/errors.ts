export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "DATA_INSUFFICIENT"
  | "NOT_IMPLEMENTED_MVP"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Array<{ path: string; message: string }>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function unauthorized(message = "인증이 필요합니다.") {
  return new AppError("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "권한이 없습니다.") {
  return new AppError("FORBIDDEN", message, 403);
}

export function notFound(message = "리소스를 찾을 수 없습니다.") {
  return new AppError("NOT_FOUND", message, 404);
}

export function validationError(
  message: string,
  details?: Array<{ path: string; message: string }>,
) {
  return new AppError("VALIDATION_ERROR", message, 400, details);
}

export function conflict(message: string) {
  return new AppError("CONFLICT", message, 409);
}

export function dataInsufficient(message: string) {
  return new AppError("DATA_INSUFFICIENT", message, 422);
}

export function notImplementedMvp(message: string) {
  return new AppError("NOT_IMPLEMENTED_MVP", message, 403);
}
