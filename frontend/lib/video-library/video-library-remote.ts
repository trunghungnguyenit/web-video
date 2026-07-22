// ─── Đồng bộ Kho video (video_projects/video_characters/video_scenes) với Supabase ───
//
// Chỉ đồng bộ dữ liệu văn bản/cấu hình (không phải blob video/audio — vẫn ở
// `blob:` URL tạm trong RAM như hiện tại, mất khi F5, chưa upload lên Storage).
// KHÔNG đồng bộ ttsInput/veoInput vì hai object này chứa apiKey cá nhân của
// người dùng — apiKey chỉ được lưu ở localStorage (frontend/lib/api-keys-store.ts).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SourceImageItem, VideoLibraryItem } from '@/lib/video-library/video-library';
import type { VideoScene } from '@/lib/scene/scenes';
import type { SavedCharacter } from '@/lib/character/saved-characters';
import { createEmptyCharacter } from '@/lib/character/saved-characters';
import type { VideoSettings } from '@/contexts/project-settings-context';
import { DEFAULT_VIDEO_SETTINGS } from '@/contexts/project-settings-context';

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  status: VideoLibraryItem['status'];
  error_message: string | null;
  veo_model_label: string | null;
  aspect_ratio: string;
  scenes_done: number;
  scenes_total: number;
  input_content: string;
  input_type: VideoLibraryItem['inputType'] | null;
  initial_input_type: VideoLibraryItem['initialInputType'] | null;
  link_url: string | null;
  link_description: string | null;
  image_master_brief: string | null;
  image_mode: VideoLibraryItem['imageMode'] | null;
  source_images: SourceImageItem[] | null;
  source_document_path: string | null;
  source_document_name: string | null;
  source_document_mime_type: string | null;
  settings: VideoSettings;
  applied_input: VideoLibraryItem['appliedInput'];
  timeline: VideoLibraryItem['timelineDemo'];
  bgm_path: string | null;
  created_at: string;
  updated_at: string;
}

interface CharacterRow {
  id: string;
  project_id: string;
  user_id: string;
  position: number;
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
  created_at: string;
  updated_at: string;
}

interface SceneRow {
  id: string;
  project_id: string;
  user_id: string;
  index: number;
  time_start: number;
  time_end: number;
  duration_seconds: number;
  prompt: string;
  voice: string;
  status: VideoScene['status'];
  error_message: string | null;
  audio_duration_seconds: number | null;
  veo_operation_name: string | null;
  video_path: string | null;
  audio_path: string | null;
}

function toProjectRow(userId: string, item: VideoLibraryItem): ProjectRow {
  return {
    id: item.id,
    user_id: userId,
    title: item.title,
    status: item.status,
    error_message: item.errorMessage ?? null,
    veo_model_label: item.veoModelLabel || null,
    aspect_ratio: item.aspectRatio,
    scenes_done: item.scenesDone,
    scenes_total: item.scenesTotal,
    input_content: item.inputContent,
    input_type: item.inputType ?? null,
    initial_input_type: item.initialInputType ?? null,
    link_url: item.linkUrl ?? null,
    link_description: item.linkDescription ?? null,
    image_master_brief: item.imageMasterBrief ?? null,
    image_mode: item.imageMode ?? null,
    // previewUrl là signed URL tạm — không lưu DB, chỉ lưu {id,path,fileName,mimeType,prompt,label,voiceHint}
    source_images: item.sourceImages?.map(({ previewUrl: _previewUrl, ...rest }) => rest) ?? null,
    source_document_path: item.sourceDocumentPath ?? null,
    source_document_name: item.sourceDocumentName ?? null,
    source_document_mime_type: item.sourceDocumentMimeType ?? null,
    settings: item.settings,
    applied_input: item.appliedInput,
    timeline: item.timelineDemo,
    bgm_path: null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

function fromProjectRow(row: ProjectRow): Omit<VideoLibraryItem, 'characters' | 'scenes'> {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    veoModelLabel: row.veo_model_label ?? '',
    aspectRatio: row.aspect_ratio,
    scenesDone: row.scenes_done,
    scenesTotal: row.scenes_total,
    inputContent: row.input_content,
    inputType: row.input_type ?? undefined,
    initialInputType: row.initial_input_type ?? undefined,
    linkUrl: row.link_url ?? undefined,
    linkDescription: row.link_description ?? undefined,
    imageMasterBrief: row.image_master_brief ?? undefined,
    imageMode: row.image_mode ?? undefined,
    // previewUrl (signed URL) được resolveSourceUploadSignedUrls gán sau, ngay sau khi fetch
    sourceImages: row.source_images ?? undefined,
    sourceDocumentPath: row.source_document_path ?? undefined,
    sourceDocumentName: row.source_document_name ?? undefined,
    sourceDocumentMimeType: row.source_document_mime_type ?? undefined,
    settings: { ...DEFAULT_VIDEO_SETTINGS, ...(row.settings ?? {}) },
    appliedInput: row.applied_input ?? null,
    timelineDemo: row.timeline ?? null,
    // Không đồng bộ — chỉ tồn tại trong phiên làm việc hiện tại
    ttsInput: null,
    veoInput: null,
    pendingTimelineDemo: null,
    timelineFocusSceneId: null,
    isRegenerating: false,
    pendingRegeneration: null,
    regenerateError: undefined,
  };
}

function toCharacterRow(userId: string, projectId: string, position: number, c: SavedCharacter): CharacterRow {
  return {
    id: c.id,
    project_id: projectId,
    user_id: userId,
    position,
    name: c.name,
    role: c.role,
    traits: c.traits,
    outfit: c.outfit,
    description: c.description,
    style: c.style,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function fromCharacterRow(row: CharacterRow): SavedCharacter {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    traits: row.traits,
    outfit: row.outfit,
    description: row.description,
    style: row.style,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSceneRow(userId: string, projectId: string, s: VideoScene): SceneRow {
  return {
    id: s.id,
    project_id: projectId,
    user_id: userId,
    index: s.index,
    time_start: s.timeStart,
    time_end: s.timeEnd,
    duration_seconds: s.durationSeconds,
    prompt: s.prompt,
    voice: s.voice,
    status: s.status,
    error_message: s.errorMessage ?? null,
    audio_duration_seconds: s.audioDurationSeconds ?? null,
    veo_operation_name: s.veoOperationName ?? null,
    video_path: s.videoPath ?? null,
    audio_path: s.audioPath ?? null,
  };
}

function fromSceneRow(row: SceneRow): VideoScene {
  return {
    id: row.id,
    index: row.index,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    prompt: row.prompt,
    voice: row.voice,
    durationSeconds: row.duration_seconds,
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    // videoUrl/audioUrl chưa upload lên Storage — cảnh hiển thị lại icon placeholder
    videoUrl: undefined,
    audioUrl: undefined,
    audioDurationSeconds: row.audio_duration_seconds ?? undefined,
    veoOperationName: row.veo_operation_name ?? undefined,
    videoPath: row.video_path ?? undefined,
    audioPath: row.audio_path ?? undefined,
  };
}

/** Tải toàn bộ Kho video của user hiện tại từ Supabase (project + nhân vật + cảnh) */
export async function fetchRemoteVideoLibrary(
  supabase: SupabaseClient,
  userId: string,
): Promise<VideoLibraryItem[]> {
  const [{ data: projects, error: pErr }, { data: characters, error: cErr }, { data: scenes, error: sErr }] =
    await Promise.all([
      supabase.from('video_projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
      supabase.from('video_characters').select('*').eq('user_id', userId).order('position', { ascending: true }),
      supabase.from('video_scenes').select('*').eq('user_id', userId).order('index', { ascending: true }),
    ]);

  if (pErr) throw pErr;
  if (cErr) throw cErr;
  if (sErr) throw sErr;

  const charsByProject = new Map<string, SavedCharacter[]>();
  for (const row of (characters ?? []) as CharacterRow[]) {
    const list = charsByProject.get(row.project_id) ?? [];
    list.push(fromCharacterRow(row));
    charsByProject.set(row.project_id, list);
  }

  const scenesByProject = new Map<string, VideoScene[]>();
  for (const row of (scenes ?? []) as SceneRow[]) {
    const list = scenesByProject.get(row.project_id) ?? [];
    list.push(fromSceneRow(row));
    scenesByProject.set(row.project_id, list);
  }

  return ((projects ?? []) as ProjectRow[]).map((row) => ({
    ...fromProjectRow(row),
    characters: charsByProject.get(row.id) ?? [createEmptyCharacter()],
    scenes: scenesByProject.get(row.id) ?? [],
  }));
}

/**
 * Ghi đè toàn bộ Kho video của user lên Supabase — xoá project không còn tồn tại
 * cục bộ, upsert project hiện có; nhân vật/cảnh dùng upsert + xoá theo diff id
 * (không phải xoá-sạch-rồi-ghi-lại) để idempotent — an toàn khi 2 lượt push chạy
 * chồng lấn nhau (nhiều tab cùng tài khoản, hoặc debounce bắn liên tiếp lúc đang sinh cảnh).
 */
export async function pushVideoLibraryToRemote(
  supabase: SupabaseClient,
  userId: string,
  items: VideoLibraryItem[],
): Promise<void> {
  const { data: existing, error: listErr } = await supabase
    .from('video_projects')
    .select('id')
    .eq('user_id', userId);
  if (listErr) throw listErr;

  const localIds = new Set(items.map((i) => i.id));
  const remoteIds = ((existing ?? []) as { id: string }[]).map((r) => r.id);
  const toDelete = remoteIds.filter((id) => !localIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase.from('video_projects').delete().in('id', toDelete);
    if (error) throw error;
  }

  if (items.length === 0) return;

  const { error: upsertErr } = await supabase
    .from('video_projects')
    .upsert(items.map((item) => toProjectRow(userId, item)));
  if (upsertErr) throw upsertErr;

  const projectIds = items.map((i) => i.id);
  const characterRows = items.flatMap((item) =>
    item.characters.map((c, i) => toCharacterRow(userId, item.id, i, c)),
  );
  const sceneRows = items.flatMap((item) => item.scenes.map((s) => toSceneRow(userId, item.id, s)));
  const localCharacterIds = new Set(characterRows.map((r) => r.id));
  const localSceneIds = new Set(sceneRows.map((r) => r.id));

  // So id đang có trên Supabase với id local hiện tại — chỉ những id đã biến mất
  // khỏi local mới bị coi là "stale" (người dùng xoá thật), không xoá theo project_id.
  const [{ data: remoteChars, error: remoteCharsErr }, { data: remoteScenes, error: remoteScenesErr }] =
    await Promise.all([
      supabase.from('video_characters').select('id').in('project_id', projectIds),
      supabase.from('video_scenes').select('id').in('project_id', projectIds),
    ]);
  if (remoteCharsErr) throw remoteCharsErr;
  if (remoteScenesErr) throw remoteScenesErr;

  const staleCharacterIds = ((remoteChars ?? []) as { id: string }[])
    .map((r) => r.id)
    .filter((id) => !localCharacterIds.has(id));
  const staleSceneIds = ((remoteScenes ?? []) as { id: string }[])
    .map((r) => r.id)
    .filter((id) => !localSceneIds.has(id));

  // Upsert (không xoá-sạch-rồi-ghi-lại) — 2 lượt push chồng lấn ghi cùng id không
  // còn báo lỗi duplicate-key, tự hội tụ an toàn.
  console.log(
    '[video-library] push scenes:',
    sceneRows.map((r) => ({ id: r.id, video_path: r.video_path, audio_path: r.audio_path })),
  );

  const [upsertCharsRes, upsertScenesRes] = await Promise.all([
    characterRows.length > 0
      ? supabase.from('video_characters').upsert(characterRows)
      : Promise.resolve({ error: null }),
    sceneRows.length > 0
      ? supabase.from('video_scenes').upsert(sceneRows)
      : Promise.resolve({ error: null }),
  ]);
  if (upsertCharsRes.error) throw upsertCharsRes.error;
  if (upsertScenesRes.error) {
    console.error('[video-library] upsert video_scenes thất bại:', upsertScenesRes.error);
    throw upsertScenesRes.error;
  }
  console.log('[video-library] push scenes: upsert thành công.');

  // Chỉ xoá đúng id đã tính stale ở trên — id vừa được 1 lượt push khác insert
  // xong sẽ không nằm trong danh sách này nên không bao giờ bị xoá nhầm.
  const [delCharsRes, delScenesRes] = await Promise.all([
    staleCharacterIds.length > 0
      ? supabase.from('video_characters').delete().in('id', staleCharacterIds)
      : Promise.resolve({ error: null }),
    staleSceneIds.length > 0
      ? supabase.from('video_scenes').delete().in('id', staleSceneIds)
      : Promise.resolve({ error: null }),
  ]);
  if (delCharsRes.error) throw delCharsRes.error;
  if (delScenesRes.error) throw delScenesRes.error;
}
