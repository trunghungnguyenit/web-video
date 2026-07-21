// ─── Gom form → geminiInput / veoInput / ttsInput gửi backend ─────────────────

import type { SavedCharacter } from '@/lib/character/saved-characters';

export interface PipelineCharacter {
  name: string;
  role: string;
  traits: string;
  outfit: string;
  description: string;
  style: string;
  /** Ảnh tham chiếu (base64, không kèm prefix data URL) — gửi làm ảnh mồi cho Veo giữ nhất quán ngoại hình qua các cảnh */
  imageBase64?: string;
  imageMimeType?: string;
}

/** Tách data URL (`data:image/png;base64,xxx`) thành base64 thuần + mimeType — undefined nếu không parse được */
export function parseDataUrl(dataUrl: string | undefined): { base64: string; mimeType: string } | undefined {
  if (!dataUrl) return undefined;
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) return undefined;
  return { mimeType: match[1], base64: match[2] };
}

export interface GeminiInput {
  apiKey: string;
  content: string;
  language: string;
  sceneCount: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  /**
   * Tab "Từ hình ảnh" — 'multi' (nhiều ảnh, mỗi ảnh 1 cảnh/1 look độc lập — lookbook) |
   * 'single' (1 ảnh + Prompt tổng, câu chuyện liên tục nhiều cảnh). Quyết định backend dùng
   * quy tắc "phim liên tục" (single) hay "lookbook — trang phục đổi mỗi cảnh" (multi).
   */
  imageMode?: 'multi' | 'single';
  characters?: PipelineCharacter[];
  /** Tab link — URL video gốc */
  sourceVideoUrl?: string;
  /** Video file (base64) — BE upload Gemini Files API */
  videoFileBase64?: string;
  videoFileMimeType?: string;
  videoFileName?: string;
  /** Tab "Từ file" — tài liệu PDF/DOC/DOCX/TXT (base64), BE trích xuất/đọc trực tiếp */
  documentFileBase64?: string;
  documentFileMimeType?: string;
  documentFileName?: string;
}

export interface VeoInput {
  apiKey?: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality?: string;
  /** Model Veo do user chọn */
  veoModel?: string;
  sceneStyle?: string;
  sceneStyleId?: string;
  characters?: PipelineCharacter[];
  /**
   * Ảnh Master Cast / tham chiếu đồng nhất nhân vật (tab link).
   * Gửi kèm mọi cảnh — Veo: instance.image; Kie: image-to-video.
   */
  referenceImage?: { base64: string; mimeType: string };
  /**
   * Mô tả nhân vật do Gemini Vision phân tích trực tiếp từ ảnh Character Sheet
   * (tab link) — chèn vào ĐẦU prompt mọi cảnh lúc gửi Veo/Kie để củng cố thêm
   * cho ảnh tham chiếu (KHÔNG lưu vào scene.prompt, chỉ ghép lúc gửi request).
   */
  masterCharacterText?: string;
  /** Nhà cung cấp sinh video — mặc định 'veo' nếu không truyền */
  provider?: 'veo' | 'kie';
  /** Chế độ nội dung Grok Imagine (chỉ áp dụng khi provider = 'kie') */
  kieMode?: 'fun' | 'normal' | 'spicy';
  /**
   * Scene Continuity — chỉ Veo 3.1. Khi bật, cảnh sau (không phải cảnh 1) dùng KHUNG HÌNH
   * CUỐI của cảnh liền trước làm khung đầu (/veo/generate FIRST_AND_LAST_FRAMES_2_VIDEO),
   * neo lại nhân vật/bối cảnh bằng pixel thật.
   */
  sceneContinuity?: boolean;
}

export interface TtsInput {
  apiKey?: string;
  voice: string;
  language: string;
  voiceSpeed?: number;
  /** false = bỏ qua ElevenLabs — dùng audio native trong video (Veo) */
  enabled?: boolean;
}

/**
 * Ghép mô tả nhân vật (Gemini Vision phân tích Character Sheet) vào prompt cảnh —
 * chỉ dùng lúc gửi request Veo/Kie, KHÔNG lưu ngược vào scene.prompt để giữ UI sửa
 * cảnh sạch sẽ. Đặt SAU nội dung cảnh, đóng khung như 1 ghi chú tham chiếu nhận dạng
 * (KHÔNG phải nội dung cảnh) — tránh model "vẽ lại" character sheet như 1 shot riêng.
 */
export function buildScenePrompt(scenePrompt: string, masterCharacterText?: string): string {
  const text = masterCharacterText?.trim();
  if (!text) return scenePrompt;
  // Nội dung cảnh (hành động/bối cảnh thật) đặt TRƯỚC — đây mới là thứ cần vẽ ra. Ghi
  // chú nhận dạng nhân vật đặt SAU, đóng khung rõ là tham chiếu/ràng buộc (KHÔNG phải nội
  // dung của cảnh) — tránh AI hiểu nhầm thành 1 shot riêng để "vẽ lại" character sheet/portrait.
  return (
    `${scenePrompt}\n\n` +
    `[Character identity reference — NOT part of this shot, do not render as a separate portrait/turnaround: ` +
    `while performing the action above, the character(s) simply keep this exact existing appearance ` +
    `(face, hairstyle, outfit, colors, art style) unchanged: ${text}]`
  );
}

export interface AnalyzePipelineRequest {
  geminiInput: GeminiInput;
  veoInput: VeoInput;
  ttsInput: TtsInput;
}
/** Chuyển đổi danh sách nhân vật từ SavedCharacter sang PipelineCharacter */
export function toPipelineCharacters(list: SavedCharacter[]): PipelineCharacter[] {
  return list
    .filter((c) => c.name.trim())
    .map((c) => {
      const image = parseDataUrl(c.avatarDataUrl);
      return {
        name: c.name.trim(),
        role: c.role.trim(),
        traits: c.traits.trim(),
        outfit: c.outfit.trim(),
        description: c.description.trim(),
        style: c.style.trim() || 'Realistic',
        imageBase64: image?.base64,
        imageMimeType: image?.mimeType,
      };
    });
}

export interface BuildPipelineParams {
  geminiApiKey: string;
  veoApiKey?: string;
  ttsApiKey?: string;
  content: string;
  language: string;
  sceneCount: string;
  aspectRatio: string;
  sceneDuration: string;
  videoQuality: string;
  veoModel?: string;
  voice: string;
  voiceSpeed: number;
  sceneStyleLabel: string;
  sceneStyleId: string;
  inputType: 'text' | 'link' | 'image' | 'file';
  imageMode?: 'multi' | 'single';
  characters: PipelineCharacter[];
  provider?: 'veo' | 'kie';
  kieMode?: 'fun' | 'normal' | 'spicy';
  sceneContinuity?: boolean;
  sourceVideoUrl?: string;
  videoFileBase64?: string;
  videoFileMimeType?: string;
  videoFileName?: string;
  documentFileBase64?: string;
  documentFileMimeType?: string;
  documentFileName?: string;
}

/** Gom form → 3 payload riêng cho Gemini / Veo / TTS */
export function buildAnalyzePipeline(params: BuildPipelineParams): AnalyzePipelineRequest {
  const characters = params.characters.length > 0 ? params.characters : undefined;

  return {
    geminiInput: {
      apiKey: params.geminiApiKey,
      content: params.content,
      language: params.language,
      sceneCount: params.sceneCount,
      inputType: params.inputType,
      imageMode: params.imageMode,
      characters,
      sourceVideoUrl: params.sourceVideoUrl?.trim() || undefined,
      videoFileBase64: params.videoFileBase64 || undefined,
      videoFileMimeType: params.videoFileMimeType || undefined,
      videoFileName: params.videoFileName || undefined,
      documentFileBase64: params.documentFileBase64 || undefined,
      documentFileMimeType: params.documentFileMimeType || undefined,
      documentFileName: params.documentFileName || undefined,
    },
    veoInput: {
      apiKey: params.veoApiKey || undefined,
      aspectRatio: params.aspectRatio,
      sceneDuration: params.sceneDuration,
      videoQuality: params.videoQuality,
      // veoModel chỉ có ý nghĩa khi provider = 'veo' — bỏ qua khi dùng Grok Imagine
      // để tránh model Veo cũ còn sót trong settings gây hiểu lầm khi đọc log/debug.
      veoModel: params.provider === 'kie' ? undefined : (params.veoModel || undefined),
      sceneStyle: params.sceneStyleLabel,
      sceneStyleId: params.sceneStyleId,
      characters,
      provider: params.provider,
      kieMode: params.kieMode,
      // Chỉ có ý nghĩa với Veo 3.1 — ignore khi dùng Grok Imagine (kie.ai không hỗ trợ)
      sceneContinuity: params.provider === 'kie' ? undefined : params.sceneContinuity,
    },
    ttsInput: {
      apiKey: params.ttsApiKey || undefined,
      voice: params.voice,
      language: params.language,
      voiceSpeed: params.voiceSpeed,
      enabled: true,
    },
  };
}
