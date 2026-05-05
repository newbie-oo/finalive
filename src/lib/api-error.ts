export type ErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "pending_expired"
  | "slip_already_reviewed"
  | "enrollment_already_active"
  | "invalid_state"
  | "idempotency_mismatch"
  | "rate_limited"
  | "internal_error";

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  details?: Record<string, string>;
  request_id: string;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, string> | undefined;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, string>,
  ) {
    super(message ?? code);
    this.code = code;
    this.details = details;
    this.name = "ApiError";
  }

  toResponse(requestId: string): ApiErrorResponse {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
      request_id: requestId,
    };
  }
}

const STATUS: Record<ErrorCode, number> = {
  validation_failed: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  pending_expired: 409,
  slip_already_reviewed: 409,
  enrollment_already_active: 409,
  invalid_state: 422,
  idempotency_mismatch: 409,
  rate_limited: 429,
  internal_error: 500,
};

export function statusForCode(code: ErrorCode): number {
  return STATUS[code];
}
