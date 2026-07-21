// ─── Chuẩn hóa message lỗi hiển thị cho user — không show raw/English error ──

interface ErrorPattern {
  test: RegExp;
  message: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    test: /failed to fetch|networkerror|load failed|ERR_CONNECTION/i,
    message: 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
  },
  {
    test: /api key not valid|invalid api key|api_key_invalid/i,
    message: 'API Key không hợp lệ — kiểm tra lại tại mục API Keys.',
  },
  {
    test: /permission_denied|permission denied/i,
    message: 'API Key thiếu quyền truy cập — kiểm tra lại quyền tại nơi tạo key.',
  },
  {
    test: /resource_exhausted|quota|billing/i,
    message: 'Tài khoản API đã hết quota/billing — kiểm tra lại tại trang quản lý API Key.',
  },
  {
    test: /unauthenticated|401/,
    message: 'API Key không hợp lệ hoặc đã hết hạn — kiểm tra lại tại mục API Keys.',
  },
  {
    test: /provider is not enabled|unsupported provider|validation_failed/i,
    message: 'Đăng nhập Google chưa được bật cho ứng dụng này — liên hệ quản trị viên để cấu hình lại.',
  },
  {
    test: /popup.?closed|user closed the popup|cancelled/i,
    message: 'Đã hủy đăng nhập.',
  },
  {
    test: /invalid login credentials/i,
    message: 'Không đăng nhập được — thử lại hoặc dùng tài khoản Google khác.',
  },
  {
    test: /insufficient.*balance/i,
    message: 'Tài khoản đã hết số dư — nạp thêm tại trang quản lý API Key.',
  },
  {
    test: /rate limit|too many requests/i,
    message: 'Đang giới hạn tần suất request — chờ một lát rồi thử lại.',
  },
  {
    test: /resource not found/i,
    message: 'Không tìm thấy tài nguyên (task hoặc model không hợp lệ).',
  },
  {
    test: /parameter validation failed|invalid request parameters/i,
    message: 'Tham số gửi lên không hợp lệ — thử đổi mô tả cảnh hoặc cài đặt.',
  },
];

/** Message quá dài hoặc chứa dấu hiệu lỗi kỹ thuật (stack, code lạ) — không nên hiện nguyên văn */
function looksTechnical(message: string): boolean {
  if (message.length > 220) return true;
  return /\bat \S+:\d+:\d+|node_modules|wasm|undefined is not|Cannot read propert/i.test(message);
}

/** Message đã có vẻ là tiếng Việt thân thiện (đa số message từ backend/services hiện tại) */
function looksLikeFriendlyVietnamese(message: string): boolean {
  return /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(message);
}

/**
 * Chuyển bất kỳ lỗi nào (Error, string, unknown) thành message tiếng Việt rõ ràng,
 * an toàn để hiển thị trực tiếp cho user — không bao giờ lộ stack trace / object lạ.
 */
export function toUserMessage(err: unknown, fallback = 'Đã xảy ra lỗi — vui lòng thử lại.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!raw.trim()) return fallback;

  const matched = ERROR_PATTERNS.find((p) => p.test.test(raw));
  if (matched) return matched.message;

  if (looksLikeFriendlyVietnamese(raw) && !looksTechnical(raw)) {
    return raw;
  }

  if (looksTechnical(raw)) return fallback;

  // Message tiếng Anh ngắn, không khớp pattern nào đã biết — vẫn không chắc user hiểu được,
  // nhưng ngắn nên giữ lại kèm fallback để không mất thông tin hoàn toàn.
  return raw.length <= 140 ? raw : fallback;
}
