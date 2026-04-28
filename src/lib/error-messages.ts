import type { ErrorCode } from "./api-error";

const errorMessages: Record<ErrorCode, string> = {
  validation_failed: "ข้อมูลไม่ถูกต้อง โปรดตรวจสอบและลองใหม่",
  unauthorized: "กรุณาเข้าสู่ระบบ",
  forbidden: "คุณไม่มีสิทธิ์เข้าถึงรายการนี้",
  not_found: "ไม่พบข้อมูลที่ต้องการ",
  conflict: "ข้อมูลขัดแย้งกัน โปรดลองอีกครั้ง",
  pending_expired: "การชำระเงินหมดอายุแล้ว กรุณาเริ่มใหม่",
  slip_already_reviewed: "สลิปนี้ถูกตรวจสอบไปแล้ว",
  enrollment_already_active: "คุณมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว",
  invalid_state: "ดำเนินการไม่ได้ในขณะนี้",
  idempotency_mismatch: "การกระทำซ้ำซ้อน กรุณารอสักครู่",
  rate_limited: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่",
  internal_error: "เกิดข้อผิดพลาด กรุณาลองใหม่",
};

export function thaiErrorMessage(code: ErrorCode): string {
  return errorMessages[code] ?? errorMessages.internal_error;
}
