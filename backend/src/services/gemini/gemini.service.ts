import type {
  AnalyzePipelineRequest,
  GeminiVideoScript,
  PipelineCharacter,
} from '../../types/pipeline';
import { VEO_QUALITY_LABELS } from '../../lib/veo-config';
import { hasPoolKeys, poolKeysInOrder, advancePoolCursor } from '../../lib/gemini-key-pool';
import {
  deleteGeminiFile,
  isYouTubeUrl,
  normalizeYouTubeUrl,
  uploadVideoAndWaitActive,
  type GeminiUploadedFile,
} from './gemini-files.service';
import {
  buildStoryPipelineSchema,
  buildCinematicContinuityRules,
  buildLookbookRules,
  buildSceneVisualPrompt,
  parseSceneStates,
  parseStoryTimeline,
  propagateSceneStates,
} from './story-continuity';
import { extractDocument } from './document-extract.service';

const DEFAULT_MODEL = 'gemini-flash-latest';

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string; details?: unknown };
}

type GeminiPart =
  | { text: string }
  | { file_data: { file_uri: string; mime_type?: string } }
  | { inline_data: { mime_type: string; data: string } };

const LANGUAGE_LABELS: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
  ja: '日本語',
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
  const hasVideoPart = Boolean(
    geminiInput.videoFileBase64?.trim()
    || (geminiInput.sourceVideoUrl?.trim() && isYouTubeUrl(geminiInput.sourceVideoUrl)),
  );
  // Chỉ PDF mới gửi kèm dạng file thật (inline_data) — DOC/DOCX/TXT đã được trích xuất
  // và gộp thẳng vào geminiInput.content trước khi tới đây (xem resolveDocumentFilePart)
  const hasDocumentPdfPart = Boolean(
    geminiInput.documentFileBase64?.trim()
    && (geminiInput.documentFileMimeType === 'application/pdf' || geminiInput.documentFileName?.toLowerCase().endsWith('.pdf')),
  );
  const isKieProvider = veoInput.provider === 'kie';
  // Tab "Từ hình ảnh" — chế độ "Nhiều ảnh": mỗi ảnh = 1 cảnh/1 look ĐỘC LẬP (lookbook),
  // KHÔNG phải phim liên tục — quy tắc "giữ nguyên trang phục" của continuity thường SAI ở
  // đây (trang phục phải đổi theo từng ảnh nguồn). Dùng buildLookbookRules() thay thế.
  const isMultiImageMode = geminiInput.inputType === 'image' && geminiInput.imageMode === 'multi';

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

  const videoRules = hasVideoPart
    ? `
## Video đính kèm (bắt buộc bám sát)
- Bạn ĐÃ được gửi kèm VIDEO thật (file_uri). Hãy XEM video đó.
- Kịch bản phải phản ánh đúng nội dung, nhân vật, hành động, lời thoại, trình tự trong video.
- Không bịa cảnh không có trong video. Có thể rút gọn / tái cấu trúc thành đúng ${count} cảnh.
- Phần "Nội dung" bên dưới chỉ là gợi ý bổ sung (prompt người dùng), KHÔNG thay thế video.`
    : isLinkInput
      ? `
## Lưu ý tab link (không có video bytes)
- Không có file video đính kèm — chỉ có URL/mô tả text.
- Ưu tiên mô tả người dùng; URL chỉ là tham chiếu.`
      : hasDocumentPdfPart
        ? `
## Tài liệu PDF đính kèm (bắt buộc bám sát)
- Bạn ĐÃ được gửi kèm file PDF thật. Hãy ĐỌC toàn bộ nội dung file đó (chữ, bảng, hình minh hoạ nếu có).
- Kịch bản phải dựa đúng trên nội dung PDF — không bịa thông tin không có trong file.
- Có thể tóm lược / tái cấu trúc thành đúng ${count} cảnh cho phù hợp định dạng video ngắn.
- Phần "Nội dung" bên dưới (nếu có) chỉ là ghi chú bổ sung, KHÔNG thay thế nội dung PDF.`
        : '';

  const masterCastRule = isLinkInput
    ? `\n- "masterCastPrompt": viết bằng tiếng Anh (chuẩn prompt tạo ảnh), mô tả ngoại hình/trang phục từng nhân vật chính — ảnh tham chiếu chung cho toàn bộ video`
    : '';

  return `Bạn là award-winning Hollywood film director, screenwriter, storyboard artist, và cinematic AI prompt engineer.

${isMultiImageMode
    ? `Nhiệm vụ: tạo MỘT bộ ảnh/video LOOKBOOK gồm ${count} cảnh — mỗi cảnh ứng với ĐÚNG 1 ảnh nguồn do người dùng cung cấp, thể hiện 1 trang phục/thiết kế RIÊNG BIỆT của CÙNG một người mẫu/nhân vật. Đây KHÔNG phải phim kể chuyện liên tục — mỗi cảnh là 1 look/shot độc lập.

Pipeline: Mỗi ảnh + prompt riêng → hiểu bối cảnh chung (storyTimeline) → tách ${count} segments (scenes[] state đầy đủ, MỖI cảnh có trang phục riêng theo đúng ảnh nguồn) → hệ thống ghép state thành Video Prompt (bạn KHÔNG tự viết prompt Veo trực tiếp).

Giữ giọng thực tế, rõ ràng như video thời trang/quảng cáo sản phẩm — không cần kịch tính/cảm xúc tiến triển giữa các cảnh vì mỗi cảnh là 1 look độc lập.`
    : `Nhiệm vụ: tạo MỘT bộ phim liên tục đã chia thành các cảnh — KHÔNG tạo các cảnh độc lập. Mỗi cảnh chỉ là segment của cùng một movie; khi ghép video phải seamless, không discontinuity.

Pipeline: Nội dung/Video → hiểu TOÀN BỘ phim (storyTimeline) → tách ${count} segments kế thừa liên tục (scenes[] state đầy đủ) → hệ thống ghép state thành Video Prompt (bạn KHÔNG tự viết prompt Veo trực tiếp).

TỰ SUY LUẬN phong cách/mức độ kịch tính phù hợp TỪ CHÍNH nội dung/prompt người dùng bên dưới (không có lựa chọn "kiểu video" nào được truyền vào) — ví dụ nội dung kể chuyện thì kịch tính, cảm xúc tiến triển rõ; nội dung hướng dẫn/sản phẩm/quảng cáo thì giữ giọng thực tế, rõ ràng, không gượng ép cảm xúc kịch tính không phù hợp. DÙ phong cách nào, quy tắc liên kết cảnh/không lặp hành động ở dưới vẫn LUÔN áp dụng — mọi video đều phải là các đoạn nối tiếp nhau như 1 video liên tục, không phải các clip rời rạc.`}

${isMultiImageMode ? buildLookbookRules() : buildCinematicContinuityRules()}

## Cài đặt Gemini (kịch bản)
- Ngôn ngữ voiceover: ${lang}
- Số cảnh: đúng ${count} cảnh
- Loại đầu vào: ${geminiInput.inputType}
${geminiInput.sourceVideoUrl?.trim() ? `- Source video URL: ${geminiInput.sourceVideoUrl.trim()}` : ''}
${videoRules}

## Cài đặt Veo/Kie (video)
- Tỷ lệ khung hình: ${ratio}
- Thời lượng cảnh: ${duration}
- Chất lượng video: ${quality}${style}${styleId}
- Video có audio native — MỌI mô tả âm thanh môi trường/chuyển động phải bằng tiếng Anh. Nếu có video đính kèm: nghe/xem video để mô tả ĐÚNG âm thanh/chuyển động THẬT xảy ra trong đúng đoạn đó (va chạm, bước chân, động cơ, tiếng đám đông, SFX hành động...) — không bịa âm thanh chung chung không liên quan. Nếu không có video, tự suy luận âm thanh hợp lý theo cảnh (vd: "tractor engine rumbling, birds chirping, soft wind").

## Cài đặt ElevenLabs (giọng đọc — dùng cho trường voiceover)
- Giọng đọc: ${voice}
- Tốc độ: ${speed}

${isMultiImageMode
    ? `## Nhân vật (khuôn mặt/vóc dáng cố định — TRANG PHỤC đổi mỗi cảnh theo ảnh nguồn)\n${charactersBlock}`
    : `## Nhân vật cố định (ngoại hình KHÔNG được đổi qua mọi cảnh)\n${charactersBlock}`}

## Nội dung / yêu cầu người dùng
${geminiInput.content.trim()}

## Yêu cầu output — trả về DUY NHẤT JSON hợp lệ (không markdown, không giải thích) theo schema:
${buildStoryPipelineSchema(count, lang)}
${isLinkInput ? `
Thêm field "masterCastPrompt" (ngang cấp "scenes") — đoạn mô tả DUY NHẤT bằng tiếng Anh, chi tiết, gộp toàn bộ nhân vật xuất hiện thành 1 "character reference sheet" — dùng làm ảnh tham chiếu giữ nhân vật nhất quán qua mọi cảnh.` : ''}

Quy tắc bổ sung:
- ${durationRule}${veoDurationNote}
- Video Prompt fields = English, TRỪ "voiceover" (luôn ${lang} — TTS ElevenLabs đọc đè lên, KHÔNG mô tả hình ảnh) và "dialogueCue" (lời nói THẬT do Veo/Kie tự tạo giọng ngay trong video — generateAudio). dialogueCue: nếu có video đính kèm, PHẢI theo đúng ngôn ngữ nhân vật đang nói trong chính video đó (xem/nghe để xác định) — KHÔNG tự ép sang ${lang} hay tiếng Anh; nếu không có video (tab text/ảnh/file) thì dùng ${lang}
- voiceover: ngắn gọn, tự nhiên như lời dẫn phim — giọng ${voice}
- characterStates[].name: dùng ĐÚNG cùng 1 cách gọi tên xuyên suốt mọi cảnh, PHẢI viết bằng tiếng Anh (vd "Bald Prisoner", "Shin") — TRỪ KHI nội dung/video có sẵn tên riêng cụ thể thì giữ nguyên. TUYỆT ĐỐI không tự đặt nhãn mô tả bằng tiếng Việt (vd "Tù nhân đầu trọc") vì field này bị chèn thẳng vào giữa Video Prompt tiếng Anh, gây lẫn ngôn ngữ
${isMultiImageMode
    ? `- Khuôn mặt/vóc dáng/tông da nhân vật: GIỮ NGUYÊN xuyên suốt mọi cảnh (cùng 1 người mẫu). TRANG PHỤC: PHẢI đổi ở mỗi cảnh theo đúng ảnh nguồn/prompt riêng của cảnh đó — KHÔNG áp dụng "giữ nguyên trang phục"
- ƯU TIÊN bám sát đúng trang phục/thiết kế trong ảnh nguồn của TỪNG cảnh hơn là giữ nhất quán trang phục giữa các cảnh`
    : `- Nếu có nhân vật cố định ở mục trên: KHÔNG đổi ngoại hình/trang phục — chỉ emotion/pose/action/eye direction
- ƯU TIÊN giữ nguyên ngoại hình nhân vật hơn sáng tạo đổi thiết kế`}${masterCastRule}`;
}

/** Luôn dùng full pipeline StoryTimeline/StateManager/PromptBuilder — mỗi cảnh mang state
 * đầy đủ, hệ thống tự ghép thành "visual" (Gemini không tự viết prompt trực tiếp). */
function parseScript(raw: string, characters: PipelineCharacter[]): GeminiVideoScript {
  let jsonStr = raw.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) jsonStr = fence[1].trim();

  const parsed = JSON.parse(jsonStr) as {
    title?: unknown;
    storyTimeline?: unknown;
    scenes?: unknown;
    masterCastPrompt?: unknown;
  };

  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Kịch bản video';
  const masterCastPrompt = typeof parsed.masterCastPrompt === 'string' && parsed.masterCastPrompt.trim()
    ? parsed.masterCastPrompt.trim()
    : undefined;

  // StoryAnalysisService/StoryTimelineBuilder — hiểu toàn bộ câu chuyện trước khi tách cảnh
  const storyTimeline = parseStoryTimeline(parsed.storyTimeline);
  // SceneTimelineBuilder — parse cảnh có state đầy đủ (không phải "visual" rời rạc)
  let scenes = parseSceneStates(parsed.scenes);
  // StateManager — Ending State của cảnh N-1 BẮT BUỘC thành Starting State cảnh N
  scenes = propagateSceneStates(scenes, storyTimeline);

  return {
    title,
    scenes: scenes.map((s) => ({
      id: s.id,
      durationSeconds: s.durationSeconds,
      // CharacterResolver + ObjectStateManager + PromptBuilder — ghép state liên tục hoá
      // thành 1 prompt Veo/Kie hoàn chỉnh cho từng cảnh
      visual: buildSceneVisualPrompt(s, characters),
      voiceover: s.voiceover,
    })),
    masterCastPrompt,
  };
}

async function callGemini(apiKey: string, parts: GeminiPart[]): Promise<string> {
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts }],
    }),
  });

  const data = (await res.json()) as GeminiResponse;

  if (!res.ok) {
    // Log đầy đủ error.details (Google trả field-level violation ở đây, vd BadRequest
    // fieldViolations) — chỉ .message thường quá chung chung để biết đúng tham số nào sai.
    console.error('[gemini] generateContent lỗi:', {
      status: res.status,
      model,
      partsSummary: parts.map((p) =>
        'text' in p
          ? { type: 'text', length: p.text.length }
          : 'file_data' in p
            ? { type: 'file_data', file_uri: p.file_data.file_uri, mime_type: p.file_data.mime_type }
            : { type: 'inline_data', mime_type: p.inline_data.mime_type, bytes: p.inline_data.data.length },
      ),
      error: data.error,
    });
    throw new Error(data.error?.message ?? `Gemini API lỗi (${res.status})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini không trả về nội dung.');

  return text;
}

/** Gọi Gemini bằng key pool của server — hết quota key này thì tự xoay sang key kế tiếp */
async function callGeminiWithPool(parts: GeminiPart[]): Promise<string> {
  const keys = poolKeysInOrder();
  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      return await callGemini(key, parts);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Gemini API lỗi.');
      advancePoolCursor(key);
    }
  }

  throw new Error(
    `${lastError?.message ?? 'Gemini API lỗi.'} — tất cả key dự phòng trên server đều đang lỗi/hết quota.`,
  );
}

/**
 * Chuẩn bị phần video cho generateContent:
 * 1) Có videoFileBase64 → upload Files API → fileUri
 * 2) YouTube public URL → file_uri = URL (Gemini hỗ trợ sẵn, không cần upload)
 */
async function resolveVideoFilePart(
  apiKey: string,
  geminiInput: AnalyzePipelineRequest['geminiInput'],
): Promise<{ part: GeminiPart | null; uploaded?: GeminiUploadedFile }> {
  const base64 = geminiInput.videoFileBase64?.trim();
  if (base64) {
    const mimeType = geminiInput.videoFileMimeType?.trim() || 'video/mp4';
    const bytes = Buffer.from(base64, 'base64');
    const uploaded = await uploadVideoAndWaitActive({
      apiKey,
      bytes,
      mimeType,
      displayName: geminiInput.videoFileName?.trim() || `link-video-${Date.now()}`,
    });
    return {
      part: {
        file_data: {
          file_uri: uploaded.uri,
          mime_type: uploaded.mimeType || mimeType,
        },
      },
      uploaded,
    };
  }

  const url = geminiInput.sourceVideoUrl?.trim();
  if (url && isYouTubeUrl(url)) {
    return {
      part: {
        file_data: {
          // Bỏ query param thừa (vd. "&t=8s" timestamp dán từ YouTube) — Gemini trả
          // "Request contains an invalid argument" nếu file_uri không đúng dạng chuẩn.
          file_uri: normalizeYouTubeUrl(url),
          mime_type: 'video/*',
        },
      },
    };
  }

  return { part: null };
}

/**
 * Chuẩn bị phần file tài liệu (tab "Từ file") cho generateContent:
 * - PDF → trả về inline_data để Gemini tự đọc trực tiếp (native document understanding).
 * - DOC/DOCX/TXT → trích xuất text thật, GỘP vào geminiInput.content (thay vì chỉ ghi
 *   tên file như trước đây) để Gemini viết kịch bản dựa trên đúng nội dung file.
 */
async function resolveDocumentFilePart(
  geminiInput: AnalyzePipelineRequest['geminiInput'],
): Promise<{ part: GeminiPart | null; mergedContent?: string }> {
  const base64 = geminiInput.documentFileBase64?.trim();
  if (!base64) return { part: null };

  const extracted = await extractDocument({
    base64,
    mimeType: geminiInput.documentFileMimeType?.trim() || '',
    fileName: geminiInput.documentFileName?.trim(),
  });

  if (extracted.isPdf) {
    return {
      part: { inline_data: { mime_type: 'application/pdf', data: base64 } },
    };
  }

  const fileLabel = geminiInput.documentFileName?.trim() || 'tài liệu đã upload';
  const mergedContent = [
    `Nội dung trích xuất từ file "${fileLabel}":`,
    extracted.text ?? '',
    geminiInput.content?.trim() ? `\nGhi chú thêm từ người dùng:\n${geminiInput.content.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { part: null, mergedContent };
}

export async function analyzeContent(request: AnalyzePipelineRequest): Promise<GeminiVideoScript> {
  const { geminiInput } = request;

  if (
    !geminiInput.content?.trim()
    && !geminiInput.videoFileBase64?.trim()
    && !geminiInput.sourceVideoUrl?.trim()
    && !geminiInput.documentFileBase64?.trim()
  ) {
    throw new Error('Nội dung không được để trống.');
  }

  const userKey = geminiInput.apiKey?.trim();
  if (!userKey && !hasPoolKeys()) {
    throw new Error('Thiếu Gemini API Key — nhập tại mục API Keys.');
  }

  // Key dùng upload Files API phải cùng key gọi generateContent
  const filesKey = userKey || poolKeysInOrder()[0];
  if (!filesKey) {
    throw new Error('Thiếu Gemini API Key — nhập tại mục API Keys.');
  }

  // Tab "Từ file" — trích xuất trước khi build prompt vì DOC/DOCX/TXT cần GỘP text
  // thật vào geminiInput.content (PDF thì không đổi content, gửi thẳng inline_data)
  const documentResolved = await resolveDocumentFilePart(geminiInput);
  const effectiveRequest = documentResolved.mergedContent
    ? { ...request, geminiInput: { ...geminiInput, content: documentResolved.mergedContent } }
    : request;

  const prompt = buildPrompt(effectiveRequest);
  let uploaded: GeminiUploadedFile | undefined;

  try {
    const resolved = await resolveVideoFilePart(filesKey, geminiInput);
    uploaded = resolved.uploaded;

    const parts: GeminiPart[] = [{ text: prompt }];
    if (resolved.part) parts.unshift(resolved.part);
    if (documentResolved.part) parts.unshift(documentResolved.part);

    // File Files API gắn với key đã upload — generateContent phải cùng key đó.
    // YouTube file_uri / không có upload → dùng user key hoặc pool như cũ.
    const raw = uploaded
      ? await callGemini(filesKey, parts)
      : userKey
        ? await callGemini(userKey, parts)
        : await callGeminiWithPool(parts);

    try {
      return parseScript(raw, geminiInput.characters ?? request.veoInput.characters ?? []);
    } catch {
      throw new Error('Không parse được kịch bản JSON từ Gemini. Thử lại.');
    }
  } finally {
    if (uploaded?.name) {
      await deleteGeminiFile(filesKey, uploaded.name);
    }
  }
}

const CHARACTER_SHEET_VISION_PROMPT = `Bạn đang xem một "character reference sheet" (ảnh tham chiếu nhân vật) dùng để giữ nhân vật NHẤT QUÁN TUYỆT ĐỐI khi tạo video AI text-to-video/image-to-video qua nhiều cảnh riêng biệt (mỗi cảnh là 1 lần gọi API độc lập, model KHÔNG nhớ cảnh trước — nên mô tả này là tín hiệu DUY NHẤT giữ đúng ngoại hình).

Viết bằng tiếng Anh, dạng "character sheet" súc tích, CÔ ĐỌNG TỪ KHÓA (không viết văn hoa mỹ, không câu chuyện) — để khi chèn nguyên văn vào đầu MỌI prompt cảnh, model dễ bám đúng chi tiết thay vì diễn giải lại. Với mỗi nhân vật xuất hiện trong ảnh, theo đúng format 1 dòng:
"[Tên nếu có, không thì 'Character N']: [giới tính/tuổi ước lượng], [kiểu tóc + màu tóc chính xác], [khuôn mặt/đặc điểm nhận diện], [trang phục — từng món + màu sắc chính xác], [vóc dáng], [phong cách hình ảnh: vd 2D cartoon flat color / anime / realistic 3D...]."

Nếu nhiều nhân vật, mỗi người 1 dòng riêng. Không thêm tiêu đề, không markdown, không giải thích gì thêm ngoài các dòng mô tả — trả về TRỰC TIẾP nội dung đó.`;

/** Gemini Vision — phân tích ảnh Character Sheet, trả về mô tả text chi tiết dùng làm "master character" cho mọi cảnh */
export async function describeCharacterSheet(params: {
  apiKey?: string;
  imageBase64: string;
  imageMimeType: string;
}): Promise<string> {
  const imageBase64 = params.imageBase64?.trim();
  if (!imageBase64) throw new Error('Thiếu ảnh Character Sheet.');

  const userKey = params.apiKey?.trim();
  if (!userKey && !hasPoolKeys()) {
    throw new Error('Thiếu Gemini API Key — nhập tại mục API Keys.');
  }

  const parts: GeminiPart[] = [
    { inline_data: { mime_type: params.imageMimeType || 'image/png', data: imageBase64 } },
    { text: CHARACTER_SHEET_VISION_PROMPT },
  ];

  const raw = userKey ? await callGemini(userKey, parts) : await callGeminiWithPool(parts);
  const description = raw.trim();
  if (!description) throw new Error('Gemini không mô tả được ảnh Character Sheet.');
  return description;
}
