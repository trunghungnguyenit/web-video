// ─── Upload video/audio cảnh lên Supabase Storage — tránh mất khi F5 ─────────
// Bucket `scene-videos`/`scene-audio` + RLS theo folder {user_id}/... đã có sẵn
// từ supabase-data/migrations/0002_video_platform.sql — không cần bucket mới.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VideoScene } from '@/lib/scene/scenes';
import type { VideoLibraryItem } from '@/lib/video-library/video-library';

const VIDEO_BUCKET = 'scene-videos';
const AUDIO_BUCKET = 'scene-audio';
/** Signed URL sống 1 giờ — đủ cho 1 phiên làm việc, tự tạo lại ở lần load sau */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function sceneVideoPath(userId: string, projectId: string, sceneId: string): string {
  return `${userId}/${projectId}/${sceneId}.mp4`;
}

function sceneAudioPath(userId: string, projectId: string, sceneId: string): string {
  return `${userId}/${projectId}/${sceneId}.mp3`;
}

/** Upload video/audio (blob: URL) của 1 cảnh lên Storage — trả path đã lưu */
export async function uploadSceneAssets(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  scene: VideoScene,
): Promise<{ videoPath?: string; audioPath?: string }> {
  const result: { videoPath?: string; audioPath?: string } = {};

  if (scene.videoUrl?.startsWith('blob:')) {
    const blob = await (await fetch(scene.videoUrl)).blob();
    const path = sceneVideoPath(userId, projectId, scene.id);
    const { error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(path, blob, { contentType: blob.type || 'video/mp4', upsert: true });
    if (error) throw error;
    result.videoPath = path;
  }

  if (scene.audioUrl?.startsWith('blob:')) {
    const blob = await (await fetch(scene.audioUrl)).blob();
    const path = sceneAudioPath(userId, projectId, scene.id);
    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, blob, { contentType: blob.type || 'audio/mpeg', upsert: true });
    if (error) throw error;
    result.audioPath = path;
  }

  return result;
}

/** Xoá file Storage của các cảnh (video + audio) — gọi khi user xoá cảnh khỏi mục 3 */
export async function deleteSceneAssets(
  supabase: SupabaseClient,
  scenes: Pick<VideoScene, 'videoPath' | 'audioPath'>[],
): Promise<void> {
  const videoPaths = scenes.map((s) => s.videoPath).filter((p): p is string => Boolean(p));
  const audioPaths = scenes.map((s) => s.audioPath).filter((p): p is string => Boolean(p));
  if (videoPaths.length === 0 && audioPaths.length === 0) return;

  const [videoRes, audioRes] = await Promise.all([
    videoPaths.length > 0 ? supabase.storage.from(VIDEO_BUCKET).remove(videoPaths) : Promise.resolve({ error: null }),
    audioPaths.length > 0 ? supabase.storage.from(AUDIO_BUCKET).remove(audioPaths) : Promise.resolve({ error: null }),
  ]);
  if (videoRes.error) throw videoRes.error;
  if (audioRes.error) throw audioRes.error;
}

/** Số file tối đa lấy mỗi lần gọi `list()` — Supabase Storage mặc định chỉ trả 100 */
const STORAGE_LIST_PAGE_SIZE = 1000;

/** Liệt kê TOÀN BỘ file trong 1 "folder" của bucket — tự lặp qua nhiều trang nếu vượt quá 1 lần list() */
async function listAllFiles(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const names: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: STORAGE_LIST_PAGE_SIZE, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;

    names.push(...data.map((f) => f.name));
    if (data.length < STORAGE_LIST_PAGE_SIZE) break;
    offset += STORAGE_LIST_PAGE_SIZE;
  }

  return names;
}

/**
 * Xoá toàn bộ file Storage của 1 project — list theo prefix `{userId}/{projectId}`
 * (phân trang, không giới hạn 100 file/lần) rồi remove hết, vì project bị xoá không
 * còn scene id cụ thể để xoá theo path. Gọi khi user xoá cả video khỏi Kho video.
 */
export async function deleteProjectStorageAssets(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<void> {
  const prefix = `${userId}/${projectId}`;

  await Promise.all(
    [VIDEO_BUCKET, AUDIO_BUCKET].map(async (bucket) => {
      const names = await listAllFiles(supabase, bucket, prefix);
      if (names.length === 0) return;
      const paths = names.map((name) => `${prefix}/${name}`);
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) throw removeError;
    }),
  );
}

/** Tạo Signed URL cho toàn bộ cảnh đã có video_path/audio_path — gọi 1 lần khi load Kho video */
export async function resolveSceneSignedUrls(
  supabase: SupabaseClient,
  items: VideoLibraryItem[],
): Promise<VideoLibraryItem[]> {
  const videoPaths: string[] = [];
  const audioPaths: string[] = [];
  for (const item of items) {
    for (const s of item.scenes) {
      if (s.videoPath) videoPaths.push(s.videoPath);
      if (s.audioPath) audioPaths.push(s.audioPath);
    }
  }
  console.log(`[video-library] resolveSceneSignedUrls: ${videoPaths.length} video, ${audioPaths.length} audio path(s) cần tạo signed URL.`);
  if (videoPaths.length === 0 && audioPaths.length === 0) return items;

  const [videoRes, audioRes] = await Promise.all([
    videoPaths.length > 0
      ? supabase.storage.from(VIDEO_BUCKET).createSignedUrls(videoPaths, SIGNED_URL_TTL_SECONDS)
      : Promise.resolve({ data: null, error: null }),
    audioPaths.length > 0
      ? supabase.storage.from(AUDIO_BUCKET).createSignedUrls(audioPaths, SIGNED_URL_TTL_SECONDS)
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Trước đây lỗi ở bước này bị nuốt âm thầm — video "biến mất" sau F5 mà không có
  // dấu vết gì để biết tại sao (bucket Storage chưa tồn tại / RLS chặn / path sai...).
  // Log rõ ràng để còn chẩn đoán được nguyên nhân thật.
  if (videoRes.error) {
    console.error('[video-library] Tạo signed URL video thất bại:', videoRes.error);
  }
  if (audioRes.error) {
    console.error('[video-library] Tạo signed URL audio thất bại:', audioRes.error);
  }
  for (const r of videoRes.data ?? []) {
    if (r.error) console.error(`[video-library] Signed URL lỗi cho video "${r.path}":`, r.error);
  }
  for (const r of audioRes.data ?? []) {
    if (r.error) console.error(`[video-library] Signed URL lỗi cho audio "${r.path}":`, r.error);
  }

  const videoUrlByPath = new Map(
    (videoRes.data ?? []).filter((r) => r.path && r.signedUrl).map((r) => [r.path as string, r.signedUrl]),
  );
  const audioUrlByPath = new Map(
    (audioRes.data ?? []).filter((r) => r.path && r.signedUrl).map((r) => [r.path as string, r.signedUrl]),
  );

  return items.map((item) => ({
    ...item,
    scenes: item.scenes.map((s) => ({
      ...s,
      videoUrl: s.videoPath ? videoUrlByPath.get(s.videoPath) ?? s.videoUrl : s.videoUrl,
      audioUrl: s.audioPath ? audioUrlByPath.get(s.audioPath) ?? s.audioUrl : s.audioUrl,
    })),
  }));
}
