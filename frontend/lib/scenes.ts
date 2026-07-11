// ─── Kiểu dữ liệu cảnh video ────────────────────────────────────────────────

import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import {
  resolveSceneDurationSeconds,
  snapToVeoDuration,
} from '@/lib/veo-duration';

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
}

export interface SceneGenerationInput {
  content: string;
  sceneCount: string | number;
  videoType: string;
  language: string;
  aspectRatio?: string;
  sceneDuration?: string;
  videoQuality?: string;
  sceneStyle?: string;
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

const VIDEO_TYPE_PROMPT_HINT: Record<string, string> = {
  storytelling: 'Cinematic storytelling shot',
  tutorial: 'Clear instructional visual',
  ads: 'High-impact advertising frame',
  review: 'Product review showcase',
};

/** Parse sceneCount form → số nguyên dương (mặc định 5) */
function parseSceneCount(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/** Tách nội dung thành đoạn — ưu tiên numbered list, bullet, đoạn văn, câu */
function extractSegments(content: string): string[] {
  const text = content.trim();
  if (!text) return [];

  const numbered = text
    .split(/\n(?=\s*\d+[\.\)]\s)/)
    .map((s) => s.replace(/^\s*\d+[\.\)]\s*/, '').trim())
    .filter(Boolean);
  if (numbered.length >= 2) return numbered;

  const bullets = text
    .split(/\n(?=[\-\*•]\s)/)
    .map((s) => s.replace(/^[\-\*•]\s*/, '').trim())
    .filter(Boolean);
  if (bullets.length >= 2) return bullets;

  const paragraphs = text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (paragraphs.length >= 2) return paragraphs;

  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean);
  return sentences?.length ? sentences : [text];
}

/** Gom hoặc chia đoạn để khớp số cảnh yêu cầu */
function bucketSegments(segments: string[], count: number): string[] {
  if (count <= 0) return [];
  if (segments.length === 0) {
    return Array.from({ length: count }, (_, i) => `Nội dung cảnh ${i + 1}`);
  }

  if (segments.length === count) return segments;

  if (segments.length > count) {
    const result: string[] = [];
    const perBucket = segments.length / count;
    for (let i = 0; i < count; i++) {
      const start = Math.floor(i * perBucket);
      const end = Math.floor((i + 1) * perBucket);
      result.push(segments.slice(start, end).join(' '));
    }
    return result;
  }

  const result = [...segments];
  while (result.length < count) {
    const longestIdx = result.reduce(
      (best, s, i, arr) => (s.length > arr[best].length ? i : best),
      0,
    );
    const longest = result[longestIdx];
    const mid = Math.floor(longest.length / 2);
    const splitAt = longest.indexOf(' ', mid);
    if (splitAt === -1) {
      result.push(`Phần mở rộng cảnh ${result.length + 1} — tiếp nối nội dung video.`);
    } else {
      result[longestIdx] = longest.slice(0, splitAt).trim();
      result.splice(longestIdx + 1, 0, longest.slice(splitAt).trim());
    }
  }
  return result.slice(0, count);
}

const ASPECT_RATIO_PROMPT_HINT: Record<string, string> = {
  '16:9': '16:9 landscape',
  '9:16': '9:16 vertical portrait',
  '1:1': '1:1 square',
};

/** Sinh video prompt tiếng Anh từ chunk nội dung + loại video + style */
function buildVideoPrompt(
  chunk: string,
  index: number,
  total: number,
  videoType: string,
  sceneStyle?: string,
  aspectRatio?: string,
): string {
  const hint = VIDEO_TYPE_PROMPT_HINT[videoType] ?? 'Video frame';
  const style = sceneStyle ? `, ${sceneStyle} style` : '';
  const ratio = aspectRatio ? `, ${ASPECT_RATIO_PROMPT_HINT[aspectRatio] ?? aspectRatio}` : '';
  const visual = chunk.replace(/\n/g, ' ').trim();
  return `${hint} — Cảnh ${index}/${total}${style}${ratio}: ${visual.slice(0, 280)}`;
}

/** Rút gọn chunk thành lời thoại TTS (tối đa 400 ký tự) */
function buildVoiceText(chunk: string): string {
  return chunk
    .replace(/^[\d\.\)\-\*•]+\s*/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 400);
}

/** Wrapper gọi resolveSceneDurationSeconds cho pipeline local */
function resolveSceneDuration(
  raw: string | undefined,
  voice: string,
  videoQuality?: string,
): number {
  return resolveSceneDurationSeconds(raw, voice, videoQuality);
}

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
export function sceneEffectiveDuration(scene: VideoScene): number {
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

/** Phân tích nội dung mục 2 → sinh danh sách cảnh với video prompt & voice TTS */
export function generateScenesFromContent(input: SceneGenerationInput): VideoScene[] {
  const count = parseSceneCount(input.sceneCount);
  const segments = bucketSegments(extractSegments(input.content), count);
  let cursor = 0;
  const baseId = Date.now();

  const scenes = segments.map((segment, i) => {
    const voice = buildVoiceText(segment) || `Lời thoại cảnh ${i + 1}`;
    const prompt = buildVideoPrompt(
      segment || voice,
      i + 1,
      count,
      input.videoType,
      input.sceneStyle,
      input.aspectRatio,
    );
    const durationSeconds = resolveSceneDuration(
      input.sceneDuration,
      voice,
      input.videoQuality,
    );
    const timeStart = cursor;
    const timeEnd = cursor + durationSeconds;
    cursor = timeEnd;

    return {
      id: `scene-${baseId}-${i}`,
      index: i + 1,
      timeStart,
      timeEnd,
      prompt,
      voice,
      durationSeconds,
      status: 'success' as const,
    };
  });

  return scenes;
}

/** Chuyển kịch bản JSON từ Gemini → VideoScene[] cho mục 3 */
export function scenesFromGeminiScript(
  script: { scenes: Array<{ visual: string; voiceover: string; durationSeconds?: number }> },
  sceneDurationSetting?: string,
  videoQuality?: string,
): VideoScene[] {
  const fixedDuration =
    sceneDurationSetting && sceneDurationSetting !== 'auto'
      ? parseInt(sceneDurationSetting, 10)
      : null;

  let cursor = 0;
  const baseId = Date.now();

  return script.scenes.map((scene, i) => {
    const durationSeconds = fixedDuration && Number.isFinite(fixedDuration)
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
