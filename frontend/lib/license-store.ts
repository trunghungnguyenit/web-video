// ─── Lưu License Key đã xác thực trong localStorage — gắn theo userId ───────
// Chỉ cache để không mất key khi reload trang; nguồn sự thật vẫn là Supabase
// (bảng `license_issued`) — key luôn được verify lại với backend khi khôi phục.

const STORAGE_KEY = 'web-video-license-key';

interface StoredLicense {
  userId: string;
  key: string;
}

function read(): StoredLicense | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredLicense;
  } catch {
    return null;
  }
}

/** Lấy license key đã lưu — chỉ trả về nếu đúng userId hiện tại */
export function getSavedLicenseKey(userId: string): string {
  const stored = read();
  return stored?.userId === userId ? stored.key : '';
}

/** Lưu license key đã xác thực hợp lệ, gắn với userId */
export function saveLicenseKey(userId: string, key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, key } satisfies StoredLicense));
}

/** Xóa license key đã lưu (dùng khi key không còn hợp lệ) */
export function clearSavedLicenseKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
