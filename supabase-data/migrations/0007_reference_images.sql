-- ─── Lưu ảnh tham chiếu nhân vật/Master Cast bền vững qua Supabase ───────────
-- Trước đây avatarDataUrl (video_characters) và masterCastImageDataUrl/masterCastPrompt
-- (video_projects) chỉ tồn tại trong phiên làm việc (base64, không đồng bộ Supabase) —
-- mất ảnh khi F5/đăng nhập máy khác. Giờ frontend upload ảnh lên kie.ai (file-base64-upload)
-- lấy URL công khai TRƯỚC, chỉ URL (chuỗi ngắn, không phải base64) mới lưu ở đây.

alter table public.video_characters
  add column if not exists avatar_url text;

alter table public.video_projects
  add column if not exists master_cast_prompt text,
  add column if not exists master_cast_image_url text;
