// ─── License Key = HMAC-SHA256(User UID, LICENSE_SECRET) — không thể đảo ngược ───
//
// Không "mã hóa rồi giải mã": server luôn biết UID của người đang đăng nhập (qua
// Supabase Access Token), nên chỉ cần tính lại HMAC từ UID đó và so khớp với key
// người dùng nhập — không cần giải mã ngược lại UID từ key.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

// Bảng chữ Crockford Base32 — bỏ I/L/O/U để tránh nhầm lẫn khi người dùng gõ tay
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const KEY_CHARS = 16; // 4 nhóm x 4 ký tự — khớp LICENSE_PATTERN ở frontend

function encodeBase32(bytes: Buffer, length: number): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && output.length < length) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  while (output.length < length) output += ALPHABET[0];
  return output;
}

function formatGroups(raw: string): string {
  return raw.match(/.{1,4}/g)?.join('-') ?? raw;
}

/** Sinh License Key xác định (deterministic) từ User UID — cùng UID luôn ra cùng key */
export function generateLicenseKey(userId: string): string {
  if (!env.licenseSecret) throw new Error('Server chưa cấu hình LICENSE_SECRET.');
  const digest = createHmac('sha256', env.licenseSecret).update(userId).digest();
  return formatGroups(encodeBase32(digest, KEY_CHARS));
}

function normalizeKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/-/g, '');
}

/**
 * So khớp 2 license key bất kỳ — constant-time, bỏ qua hoa/thường và dấu "-".
 * Dùng để so key người dùng nhập với `license_key` lưu trong Supabase (nguồn sự thật —
 * admin có thể sửa tay trong bảng `license_issued` để đổi/thu hồi key thủ công).
 */
export function keysMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(normalizeKey(a));
  const bufB = Buffer.from(normalizeKey(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
