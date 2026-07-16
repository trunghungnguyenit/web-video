-- ─── Bảng theo dõi License Key đã phát cho từng user (chống gửi email trùng) ───
-- Chạy file này trong Supabase Dashboard → SQL Editor.
-- Bảng chỉ được backend (service role key) đọc/ghi — không cấp quyền cho anon/authenticated.

create table if not exists public.license_issued (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  license_key  text not null,
  issued_at    timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);

alter table public.license_issued enable row level security;
-- Không tạo policy nào → mặc định chặn hết truy cập từ anon/authenticated key,
-- chỉ service role key (dùng ở backend) mới bypass được RLS.
