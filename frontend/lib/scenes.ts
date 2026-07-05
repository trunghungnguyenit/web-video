// ─── Kiểu dữ liệu cảnh video ────────────────────────────────────────────────

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
  /** Blob URL clip video — sinh sau khi cảnh hoàn thiện ở mục 3 */
  videoUrl?: string;
}

export interface SceneGenerationInput {
  content: string;
  sceneCount: string | number;
  videoType: string;
  language: string;
  sceneStyle?: string;
}

export interface SceneGenerationResult {
  scenes: VideoScene[];
  sourceContent: string;
  sceneCount: string;
  videoType: string;
  language: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VIDEO_TYPE_PROMPT_HINT: Record<string, string> = {
  storytelling: 'Cinematic storytelling shot',
  tutorial: 'Clear instructional visual',
  ads: 'High-impact advertising frame',
  review: 'Product review showcase',
};

function parseSceneCount(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

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

function buildVideoPrompt(
  chunk: string,
  index: number,
  total: number,
  videoType: string,
  sceneStyle?: string,
): string {
  const hint = VIDEO_TYPE_PROMPT_HINT[videoType] ?? 'Video frame';
  const style = sceneStyle ? `, ${sceneStyle} style` : '';
  const visual = chunk.replace(/\n/g, ' ').trim();
  return `${hint} — Cảnh ${index}/${total}${style}: ${visual.slice(0, 280)}`;
}

function buildVoiceText(chunk: string): string {
  return chunk
    .replace(/^[\d\.\)\-\*•]+\s*/gm, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 400);
}

function estimateDuration(voice: string): number {
  const words = voice.split(/\s+/).filter(Boolean).length;
  return Math.min(8, Math.max(5, Math.round(words / 2.5) || 5));
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatSceneTimeRange(scene: VideoScene): string {
  return `${formatTime(scene.timeStart)} - ${formatTime(scene.timeEnd)}`;
}

export function recalculateSceneTimings(scenes: VideoScene[]): VideoScene[] {
  let cursor = 0;
  return scenes.map((scene, i) => {
    const timeStart = cursor;
    const timeEnd = cursor + scene.durationSeconds;
    cursor = timeEnd;
    return { ...scene, index: i + 1, timeStart, timeEnd };
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
    );
    const durationSeconds = estimateDuration(voice);
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
