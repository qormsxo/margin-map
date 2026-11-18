import { DomainError } from "@/domain";
import { AppError, conflict, validationError } from "@/lib/errors";

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isMappableError(
  error: unknown,
): error is DomainError | AppError | Error {
  return (
    error instanceof DomainError ||
    error instanceof AppError ||
    error instanceof Error
  );
}

export function fromDomainError(error: DomainError): AppError {
  if (error.code === "CYCLE_DETECTED") {
    return conflict(error.message);
  }

  if (error.code === "MISSING_DATA") {
    return new AppError("NOT_FOUND", error.message, 404);
  }

  return validationError(error.message);
}

export function toAppError(error: DomainError | AppError | Error): AppError {
  if (error instanceof DomainError) {
    return fromDomainError(error);
  }

  if (error instanceof AppError) {
    return error;
  }

  return new AppError("INTERNAL_ERROR", error.message, 500);
}
