-- ─── Chế độ tab "Từ hình ảnh": 'multi' (nhiều ảnh, mỗi ảnh 1 cảnh) | 'single' (1 ảnh + Prompt tổng, nhiều cảnh) ───

alter table public.video_projects
  add column if not exists image_mode text;
