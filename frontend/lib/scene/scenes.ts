// ─── Kiểu dữ liệu cảnh video ────────────────────────────────────────────────

import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import {
  resolveSceneDurationSeconds,
  snapToVeoDuration,
} from '@/lib/veo/veo-duration';
import { resolveKieSceneDuration } from '@/lib/kie/kie-duration';

export type SceneStatus = 'generating' | 'success' | 'error' | 'edited';

export interface VideoScene {
  id: string;
  index: number;
  timeStart: number;
  timeEnd: number;
  prompt: string;
  voice: string;
  durationSeconds: number;
  status: SceneStatus;
  /** Lý do lỗi gần nhất (status === 'error') — hiển thị cho user, clear khi thử lại thành công */
  errorMessage?: string;
  /** Blob URL clip video — sinh sau khi cảnh hoàn thiện ở mục 3 */
  videoUrl?: string;
  /** Blob URL audio MP3 — ElevenLabs TTS từ voiceover */
  audioUrl?: string;
  /** Độ dài thực của MP3 (giây) — dùng sync timeline */
  audioDurationSeconds?: number;
  /** Google long-running operation — lưu để resume poll sau refresh, không gọi generate lại */
  veoOperationName?: string;
  /** Kie.ai (Grok Imagine) taskId — lưu để resume poll sau refresh, không tạo task lại */
  kieTaskId?: string;
  /** Path trong Supabase Storage bucket `scene-videos` — có nghĩa là video đã lưu cloud */
  videoPath?: string;
  /** Path trong Supabase Storage bucket `scene-audio` */
  audioPath?: string;
}

export interface SceneGenerationResult {
  scenes: VideoScene[];
  sourceContent: string;
  sceneCount: string;
  videoType: string;
  language: string;
  aspectRatio: string;
  sceneDuration: string;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format giây → `MM:SS` cho hiển thị timeline */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Chuỗi hiển thị khoảng thời gian cảnh: `00:00 - 00:06` */
export function formatSceneTimeRange(scene: VideoScene): string {
  return `${formatTime(scene.timeStart)} - ${formatTime(scene.timeEnd)}`;
}

/** Tìm cảnh chứa playhead — fallback cảnh gần nhất, không nhảy về cảnh 1 */
export function findSceneAtPlayhead(scenes: VideoScene[], playhead: number): VideoScene | null {
  if (scenes.length === 0) return null;

  const exact = scenes.find((s) => playhead >= s.timeStart && playhead < s.timeEnd);
  if (exact) return exact;

  if (playhead >= scenes[scenes.length - 1].timeEnd) {
    return scenes[scenes.length - 1];
  }

  let best = scenes[0];
  for (const s of scenes) {
    if (s.timeStart <= playhead) best = s;
  }
  return best;
}

/** Thời lượng thực tế cảnh — max(durationSeconds, audio + buffer) nếu có TTS */
function sceneEffectiveDuration(scene: VideoScene): number {
  if (scene.audioDurationSeconds != null && scene.audioDurationSeconds > 0) {
    const fromAudio = Math.ceil((scene.audioDurationSeconds + 0.5) * 10) / 10;
    return Math.max(scene.durationSeconds, fromAudio);
  }
  return scene.durationSeconds;
}

/** Chữ ký timing các cảnh — dùng detect thay đổi để re-sync preview */
export function scenesTimingSignature(scenes: VideoScene[]): string {
  return scenes
    .map((s) =>
      `${s.id}:${s.timeStart}-${s.timeEnd}:${s.durationSeconds}:${s.audioDurationSeconds ?? ''}:${s.status}`,
    )
    .join('|');
}

/** Tính lại timeStart/timeEnd/index sau khi đổi duration hoặc thứ tự cảnh */
export function recalculateSceneTimings(scenes: VideoScene[]): VideoScene[] {
  let cursor = 0;
  return scenes.map((scene, i) => {
    const durationSeconds = sceneEffectiveDuration(scene);
    const timeStart = cursor;
    const timeEnd = cursor + durationSeconds;
    cursor = timeEnd;
    return { ...scene, index: i + 1, timeStart, timeEnd, durationSeconds };
  });
}

/** Chuyển kịch bản JSON từ Gemini → VideoScene[] cho mục 3 */
//đoạn này là chia kịch bản thành các cảnh
// script là kịch bản từ Gemini
// sceneDurationSetting là độ dài của cảnh
// videoQuality là chất lượng video
// trả về mảng các cảnh
export function scenesFromGeminiScript(
  script: { scenes: Array<{ visual: string; voiceover: string; durationSeconds?: number }> },
  sceneDurationSetting?: string,
  videoQuality?: string,
  provider?: 'veo' | 'kie',
): VideoScene[] {
  const isKie = provider === 'kie';
  const fixedDuration =
    sceneDurationSetting && sceneDurationSetting !== 'auto'
      ? parseInt(sceneDurationSetting, 10)
      : null;

  let cursor = 0;
  const baseId = Date.now();

  return script.scenes.map((scene, i) => {
    // Grok Imagine (kie.ai) nhận 6–30s bất kỳ — KHÔNG snap về lưới 4/6/8 của Veo,
    // chỉ clamp an toàn, để giữ đúng thời lượng Gemini đã tính theo prompt riêng cho kie.
    const durationSeconds = isKie
      ? resolveKieSceneDuration(fixedDuration ?? scene.durationSeconds)
      : fixedDuration && Number.isFinite(fixedDuration)
        ? snapToVeoDuration(fixedDuration, videoQuality)
        : scene.durationSeconds && scene.durationSeconds > 0
          ? snapToVeoDuration(scene.durationSeconds, videoQuality)
          : resolveSceneDurationSeconds(undefined, scene.voiceover, videoQuality);
    const timeStart = cursor;
    const timeEnd = cursor + durationSeconds;
    cursor = timeEnd;

    return {
      id: `scene-${baseId}-${i}`,
      index: i + 1,
      timeStart,
      timeEnd,
      prompt: scene.visual.trim(),
      voice: scene.voiceover.trim(),
      durationSeconds,
      status: 'success' as const,
    };
  });
}
