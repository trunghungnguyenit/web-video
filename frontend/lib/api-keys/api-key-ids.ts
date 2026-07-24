// ─── Id chuẩn cho API key — tách riêng module này (không import gì khác) để
// api-keys-store.ts và api-keys-remote.ts cùng dùng chung mà KHÔNG tạo import
// vòng (circular import từng gây lỗi "Cannot access before initialization"
// lúc build production do 2 module import chéo nhau). ────────────────────────

/**
 * Id chuẩn dùng trong UI & pipeline — tránh hard-code string rải rác. Không còn `veo`
 * riêng — Veo 3.1 giờ dùng chung key `kie` (xem frontend/lib/veo/veo-models.ts).
 *
 * `veoGemini` = "Gemini Key Veo 3.1" — key RIÊNG cho nhà cung cấp "Veo3.1 Gemini" (gọi
 * thẳng Google), TÁCH BIỆT hoàn toàn với `gemini` (chỉ dùng tạo kịch bản/phân cảnh/lời
 * thoại). Tách riêng để quota/billing tạo video không đụng vào key phân tích kịch bản.
 */
export const API_KEY_IDS = {
  gemini: 'gemini',
  elevenlabs: 'elevenlabs',
  kie: 'kie',
  veoGemini: 'veo-gemini',
} as const;
