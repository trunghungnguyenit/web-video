import { Hono } from 'hono';
import { ok, fail } from '../utils/api-response';
import { getAuthedUser } from '../lib/auth';
import { generateLicenseKey, keysMatch } from '../lib/license';
import { sendLicenseEmail } from '../lib/mailer';
import { getSupabaseAdmin } from '../lib/supabase-admin';

export const licenseRoute = new Hono();

const RESEND_COOLDOWN_MS = 60_000;

/**
 * POST /api/license/issue
 * Gọi tự động ngay sau khi đăng nhập (auth-context.tsx) — chỉ gửi email License Key
 * lần đầu tiên tài khoản này xuất hiện, các lần đăng nhập sau không gửi lại.
 *
 * Insert TRƯỚC rồi mới gửi email (không phải select-rồi-insert) — insert "giành
 * quyền phát hành" nhờ user_id là primary key của license_issued, nên 2 request
 * chạy chồng lấn (vd. đăng nhập cùng lúc ở 2 tab) chỉ có đúng 1 request insert
 * thành công, request còn lại nhận lỗi unique_violation (23505) và bỏ qua, tránh
 * gửi trùng email. Đánh đổi: nếu gửi email thất bại sau khi insert đã thành công,
 * hàng đã tồn tại nên lần đăng nhập sau sẽ không tự thử gửi lại — người dùng cần tự
 * bấm "Gửi lại qua email" trong Cài đặt (POST /resend) để nhận key.
 */
licenseRoute.post('/issue', async (c) => {
  const user = await getAuthedUser(c);
  if (!user) return fail(c, 'Chưa đăng nhập hoặc token không hợp lệ.', 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return fail(c, 'Server chưa cấu hình Supabase.', 500);

  let licenseKey: string;
  try {
    licenseKey = generateLicenseKey(user.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không tạo được License Key.';
    return fail(c, message, 500);
  }

  const { error: insertError } = await supabase.from('license_issued').insert({
    user_id: user.id,
    email: user.email,
    license_key: licenseKey,
  });

  if (insertError) {
    // Request khác đã insert trước — coi như đã issue, không gửi email lần nữa.
    if (insertError.code === '23505') return ok(c, { sent: false, alreadyIssued: true });
    return fail(c, insertError.message, 500);
  }

  try {
    await sendLicenseEmail(user.email, licenseKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gửi email License Key thất bại.';
    return fail(c, message, 500);
  }

  return ok(c, { sent: true, alreadyIssued: false });
});

/**
 * POST /api/license/resend
 * Người dùng chủ động bấm "Gửi lại License Key" trong Cài đặt — có cooldown 60s
 * chống spam nút. Gửi lại đúng `license_key` đang lưu trong Supabase (nếu admin đã
 * sửa tay trong bảng `license_issued` thì email sẽ mang giá trị mới nhất đó).
 */
licenseRoute.post('/resend', async (c) => {
  const user = await getAuthedUser(c);
  if (!user) return fail(c, 'Chưa đăng nhập hoặc token không hợp lệ.', 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return fail(c, 'Server chưa cấu hình Supabase.', 500);

  const { data: existing, error: selectError } = await supabase
    .from('license_issued')
    .select('license_key, last_sent_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (selectError) return fail(c, selectError.message, 500);

  if (existing && Date.now() - new Date(existing.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
    return fail(c, 'Vừa gửi gần đây — vui lòng đợi khoảng 1 phút rồi thử lại.', 429);
  }

  // Chưa từng issue (hiếm khi xảy ra vì /issue đã tự chạy lúc đăng nhập) → tạo mới
  const licenseKey = existing?.license_key ?? generateLicenseKey(user.id);

  try {
    await sendLicenseEmail(user.email, licenseKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gửi email License Key thất bại.';
    return fail(c, message, 500);
  }

  const { error: upsertError } = await supabase.from('license_issued').upsert({
    user_id: user.id,
    email: user.email,
    license_key: licenseKey,
    last_sent_at: new Date().toISOString(),
  });
  if (upsertError) return fail(c, upsertError.message, 500);

  return ok(c, { sent: true });
});

/**
 * POST /api/license/verify
 * So sánh license key người dùng dán vào với `license_key` lưu trong Supabase
 * (bảng `license_issued`, khóa theo UID đang đăng nhập) — không recompute từ UID,
 * để admin có thể đổi/thu hồi key thủ công bằng cách sửa trực tiếp trong Supabase.
 */
licenseRoute.post('/verify', async (c) => {
  const user = await getAuthedUser(c);
  if (!user) return fail(c, 'Chưa đăng nhập hoặc token không hợp lệ.', 401);

  const body = await c.req.json<{ licenseKey?: string }>().catch(() => ({} as { licenseKey?: string }));
  if (!body.licenseKey?.trim()) return fail(c, 'Vui lòng nhập license key.');

  const supabase = getSupabaseAdmin();
  if (!supabase) return fail(c, 'Server chưa cấu hình Supabase.', 500);

  const { data, error } = await supabase
    .from('license_issued')
    .select('license_key')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return fail(c, error.message, 500);

  if (!data) return ok(c, { valid: false });

  return ok(c, { valid: keysMatch(data.license_key, body.licenseKey) });
});
