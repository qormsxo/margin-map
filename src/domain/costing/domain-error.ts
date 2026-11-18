export type DomainErrorCode =
  | "INVALID_INPUT"
  | "UNIT_CONVERSION"
  | "CYCLE_DETECTED"
  | "INFEASIBLE_TARGET"
  | "MISSING_DATA";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
