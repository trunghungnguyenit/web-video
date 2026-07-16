-- ─── API Keys theo tài khoản + sửa render_history cho phép chưa có file upload ───
-- Chạy sau 0001 và 0002.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. user_api_keys — Gemini/Veo/ElevenLabs key theo tài khoản (mục Quản lý API Keys)
--    Bắt buộc đăng nhập mới xem/nhập được — không có "guest" cho mục này.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.user_api_keys (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  gemini_key      text,
  veo_key         text,
  elevenlabs_key  text,
  updated_at      timestamptz not null default now()
);

alter table public.user_api_keys enable row level security;

create policy "user_api_keys_all_own" on public.user_api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger user_api_keys_set_updated_at
  before update on public.user_api_keys
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. render_history — cho phép file_path null (video render hiện chỉ tải thẳng
--    về máy người dùng, chưa upload lên Storage bucket `renders`)
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.render_history alter column file_path drop not null;
