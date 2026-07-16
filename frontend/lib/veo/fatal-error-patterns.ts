// ─── Pattern nhận diện lỗi "fatal" (billing/quota/key...) dùng chung Veo + Kie ───
// Đồng bộ thủ công với backend/src/lib/veo-errors.ts FATAL_PATTERNS khi đổi danh sách này.

const FATAL_ERROR_PATTERNS = [
  /billing/i,
  /quota/i,
  /resource.?exhausted/i,
  /permission/i,
  /api.?key/i,
  /invalid.?key/i,
  /exceeded/i,
  /limit/i,
  /payment/i,
  /suspended/i,
  /disabled/i,
  /unauthorized/i,
];

/** Billing / Quota / key / unauthorized — dừng ngay, không retry */
export function isFatalErrorMessage(message: string, fatalFlag?: boolean): boolean {
  if (fatalFlag) return true;
  return FATAL_ERROR_PATTERNS.some((re) => re.test(message));
}
