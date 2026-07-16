import type {
  AnalyzePipelineRequest,
  GeminiVideoScript,
  PipelineCharacter,
} from '../../types/pipeline';
import { VEO_QUALITY_LABELS } from '../../lib/veo-config';
import { hasPoolKeys, poolKeysInOrder, advancePoolCursor } from '../../lib/gemini-key-pool';

const DEFAULT_MODEL = 'gemini-flash-latest';

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
}

const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

const VIDEO_TYPE_LABELS: Record<string, string> = {
  storytelling: 'Kể chuyện',
  tutorial: 'Hướng dẫn',
  ads: 'Quảng cáo',
  review: 'Review sản phẩm',
};

const VOICE_LABELS: Record<string, string> = {
  'male-natural': 'Giọng nam – tự nhiên',
  'female-natural': 'Giọng nữ – tự nhiên',
  'male-pro': 'Giọng nam – chuyên nghiệp',
  'female-young': 'Giọng nữ – trẻ trung',
};

const ASPECT_RATIO_LABELS: Record<string, string> = {
  '16:9': 'Ngang 16:9 (YouTube)',
  '9:16': 'Dọc 9:16 (TikTok/Reels)',
  '1:1': 'Vuông 1:1 (Instagram)',
};

const SCENE_DURATION_LABELS: Record<string, string> = {
  auto: 'Tự động (4–8 giây/cảnh · Veo 3)',
  '4': '4 giây/cảnh',
  '6': '6 giây/cảnh',
  '8': '8 giây/cảnh',
};

const VOICE_SPEED_LABELS: Record<number, string> = {
  0.75: '0.75× — Chậm',
  1: '1× — Bình thường',
  1.25: '1.25× — Hơi nhanh',
  1.5: '1.5× — Nhanh',
  2: '2× — Rất nhanh',
};

function formatCharacters(characters: PipelineCharacter[] | undefined): string {
  const list = characters?.filter((c) => c.name?.trim()) ?? [];
  if (list.length === 0) {
    return 'Không có nhân vật cụ thể — tạo cảnh phù hợp nội dung.';
  }

  return list
    .map(
      (c, i) =>
        `Nhân vật ${i + 1}:
- Tên: ${c.name.trim()}
- Vai trò: ${c.role?.trim() || '—'}
- Đặc điểm: ${c.traits?.trim() || '—'}
- Trang phục: ${c.outfit?.trim() || '—'}
- Phong cách hình ảnh nhân vật: ${c.style?.trim() || 'Realistic'}
- Mô tả chi tiết: ${c.description?.trim() || '—'}`,
    )
    .join('\n\n');
}

function buildPrompt({ geminiInput, veoInput, ttsInput }: AnalyzePipelineRequest): string {
  const count = parseInt(geminiInput.sceneCount, 10) || 5;
  const lang = LANGUAGE_LABELS[geminiInput.language] ?? geminiInput.language;
  const videoType = VIDEO_TYPE_LABELS[geminiInput.videoType] ?? geminiInput.videoType;
  const voice = VOICE_LABELS[ttsInput.voice] ?? ttsInput.voice;
  const ratio = ASPECT_RATIO_LABELS[veoInput.aspectRatio] ?? veoInput.aspectRatio;
  const duration = SCENE_DURATION_LABELS[veoInput.sceneDuration] ?? veoInput.sceneDuration;
  const quality = VEO_QUALITY_LABELS[veoInput.videoQuality ?? '720p'] ?? veoInput.videoQuality ?? '720p';
  const style = veoInput.sceneStyle?.trim()
    ? `\n- Phong cách cảnh Veo (visual): ${veoInput.sceneStyle}`
    : '';
  const styleId = veoInput.sceneStyleId?.trim()
    ? `\n- ID phong cách cảnh: ${veoInput.sceneStyleId}`
    : '';
  const speed =
    ttsInput.voiceSpeed != null
      ? VOICE_SPEED_LABELS[ttsInput.voiceSpeed] ?? `${ttsInput.voiceSpeed}×`
      : '1× — Bình thường';
  const charactersBlock = formatCharacters(
    geminiInput.characters ?? veoInput.characters,
  );

  const isLinkInput = geminiInput.inputType === 'link';
  const isKieProvider = veoInput.provider === 'kie';

  const durationRule = isKieProvider
    ? 'Mỗi cảnh durationSeconds trong khoảng 6–30 (Grok Imagine). Chế độ tự động: chọn số giây phù hợp độ dài voiceover.'
    : veoInput.sceneDuration === 'auto'
      ? 'Mỗi cảnh durationSeconds chỉ được 4, 6 hoặc 8 (Veo 3). Chế độ tự động: chọn 4/6/8 phù hợp độ dài voiceover.'
      : `Mỗi cảnh durationSeconds = ${veoInput.sceneDuration} (cố định — Veo 3 chỉ hỗ trợ 4, 6 hoặc 8 giây).`;

  const veoDurationNote = isKieProvider
    ? '\n- Lưu ý Grok Imagine: thời lượng video mỗi cảnh 6–30 giây.'
    : veoInput.videoQuality === '1080p'
      ? '\n- Lưu ý Veo: 1080p bắt buộc mỗi cảnh 8 giây.'
      : '\n- Lưu ý Veo: thời lượng video mỗi cảnh chỉ 4, 6 hoặc 8 giây.';

  return `Bạn là biên kịch video AI. Phân tích nội dung và tạo kịch bản video.

## Cài đặt Gemini (kịch bản)
- Ngôn ngữ: ${lang}
- Số cảnh: đúng ${count} cảnh
- Kiểu video: ${videoType}
- Loại đầu vào: ${geminiInput.inputType}

## Cài đặt Veo (video — dùng cho trường visual)
- Tỷ lệ khung hình: ${ratio}
- Thời lượng cảnh: ${duration}
- Chất lượng video: ${quality}${style}${styleId}

## Cài đặt ElevenLabs (giọng đọc — dùng cho trường voiceover)
- Giọng đọc: ${voice}
- Tốc độ: ${speed}

## Nhân vật (xuất hiện đồng nhất trong mọi cảnh — Veo)
${charactersBlock}

## Nội dung
${geminiInput.content.trim()}

## Yêu cầu output
Trả về DUY NHẤT JSON hợp lệ (không markdown, không giải thích) theo schema:
{
  "title": "tiêu đề ngắn",
  "scenes": [
    {
      "id": 1,
      "durationSeconds": 6,
      "visual": "Prompt cho Veo — mô tả khung hình (tiếng Anh hoặc ${lang})",
      "voiceover": "Lời thoại cho ElevenLabs TTS bằng ${lang}"
    }
  ]${isLinkInput ? `,
  "masterCastPrompt": "Đoạn mô tả DUY NHẤT, chi tiết, gộp toàn bộ nhân vật xuất hiện trong video thành 1 'character reference sheet' — dùng làm ảnh tham chiếu giữ nhân vật nhất quán qua mọi cảnh"` : ''}
}

Quy tắc:
- scenes.length phải đúng ${count}
- id: 1..${count}
- ${durationRule}${veoDurationNote}
- visual: prompt Veo — tỷ lệ ${ratio}, chất lượng ${quality}${veoInput.sceneStyle ? `, phong cách ${veoInput.sceneStyle}` : ''}
- voiceover: CHỈ lời thoại đọc to (thuần ${lang}), KHÔNG mô tả hình ảnh, KHÔNG copy từ visual, KHÔNG dùng tiếng Anh nếu ngôn ngữ là ${lang}
- voiceover: ngắn gọn, tự nhiên như lời dẫn video — giọng ${voice}, kiểu ${videoType}
- Nếu có nhân vật: visual phải giữ ngoại hình/trang phục nhất quán${isLinkInput ? `
- "masterCastPrompt": viết bằng tiếng Anh (chuẩn prompt tạo ảnh), mô tả ngoại hình/trang phục từng nhân vật chính xuất hiện trong các cảnh — để dùng làm ảnh tham chiếu chung cho toàn bộ video` : ''}`;
}

function parseScript(raw: string): GeminiVideoScript {
  let jsonStr = raw.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();

  const parsed = JSON.parse(jsonStr) as GeminiVideoScript;

  if (!parsed?.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error('Gemini trả về JSON không hợp lệ — thiếu danh sách scenes.');
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title : 'Kịch bản video',
    scenes: parsed.scenes.map((s, i) => ({
      id: typeof s.id === 'number' ? s.id : i + 1,
      durationSeconds:
        typeof s.durationSeconds === 'number' && s.durationSeconds > 0
          ? s.durationSeconds
          : 6,
      visual: String(s.visual ?? '').trim() || `Visual scene ${i + 1}`,
      voiceover: String(s.voiceover ?? '').trim() || `Voiceover scene ${i + 1}`,
    })),
    masterCastPrompt: typeof parsed.masterCastPrompt === 'string' && parsed.masterCastPrompt.trim()
      ? parsed.masterCastPrompt.trim()
      : undefined,
  };
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = (await res.json()) as GeminiResponse;

  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gemini API lỗi (${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini không trả về nội dung.');

  return text;
}

/** Gọi Gemini bằng key pool của server — hết quota key này thì tự xoay sang key kế tiếp */
async function callGeminiWithPool(prompt: string): Promise<string> {
  const keys = poolKeysInOrder();
  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      return await callGemini(key, prompt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Gemini API lỗi.');
      advancePoolCursor(key);
    }
  }

  throw new Error(
    `${lastError?.message ?? 'Gemini API lỗi.'} — tất cả key dự phòng trên server đều đang lỗi/hết quota.`,
  );
}

export async function analyzeContent(request: AnalyzePipelineRequest): Promise<GeminiVideoScript> {
  const { geminiInput } = request;

  // if (!geminiInput.apiKey?.trim()) {
  //   throw new Error('Thiếu Gemini API Key.');
  // }
  if (!geminiInput.content?.trim()) {
    throw new Error('Nội dung không được để trống.');
  }

  const userKey = geminiInput.apiKey?.trim();
  if (!userKey && !hasPoolKeys()) {
    throw new Error('Thiếu Gemini API Key — nhập tại mục API Keys.');
  }

  const prompt = buildPrompt(request);
  const raw = userKey ? await callGemini(userKey, prompt) : await callGeminiWithPool(prompt);

  try {
    return parseScript(raw);
  } catch {
    throw new Error('Không parse được kịch bản JSON từ Gemini. Thử lại.');
  }
}
