import { Hono } from 'hono';
import { ok, fail } from '../../utils/api-response';
import { analyzeContent, describeCharacterSheet, buildCharacterIdentityText } from '../../services/gemini/gemini.service';
import type { AnalyzePipelineRequest } from '../../types/pipeline';

interface DescribeCharacterSheetBody {
  apiKey?: string;
  imageBase64: string;
  imageMimeType: string;
}

export const geminiRoute = new Hono();

/**
 * POST /api/gemini/analyze
 * Body: { geminiInput, veoInput, ttsInput }
 * Bước 1: Gemini tạo kịch bản — veoInput/ttsInput echo lại cho bước 2 & 3
 */
geminiRoute.post('/analyze', async (c) => {
  try {
    const body = await c.req.json<AnalyzePipelineRequest>();

    // if (!body.geminiInput?.apiKey?.trim()) {
    //   return fail(c, 'Thiếu Gemini API Key — nhập tại mục API Keys.');
    // }
    if (!body.geminiInput?.content?.trim()
      && !body.geminiInput?.videoFileBase64?.trim()
      && !body.geminiInput?.sourceVideoUrl?.trim()
      && !body.geminiInput?.documentFileBase64?.trim()) {
      return fail(c, 'Nội dung không được để trống.');
    }
    if (!body.veoInput || !body.ttsInput) {
      return fail(c, 'Thiếu veoInput hoặc ttsInput.');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[gemini/analyze] Nhận request:', {
        inputType: body.geminiInput.inputType,
        sceneCount: body.geminiInput.sceneCount,
        language: body.geminiInput.language,
        contentLength: body.geminiInput.content.length,
        characterCount: body.geminiInput.characters?.length ?? 0,
        sourceVideoUrl: body.geminiInput.sourceVideoUrl?.trim() || undefined,
        hasVideoFile: Boolean(body.geminiInput.videoFileBase64?.trim()),
        videoFileMimeType: body.geminiInput.videoFileMimeType,
        videoFileName: body.geminiInput.videoFileName,
        hasDocumentFile: Boolean(body.geminiInput.documentFileBase64?.trim()),
        documentFileMimeType: body.geminiInput.documentFileMimeType,
        documentFileName: body.geminiInput.documentFileName,
        veo: {
          aspectRatio: body.veoInput.aspectRatio,
          sceneDuration: body.veoInput.sceneDuration,
          videoQuality: body.veoInput.videoQuality,
          veoModel: body.veoInput.veoModel,
        },
      });
    }

    const script = await analyzeContent(body);
    // Mọi tab (không riêng link) — nếu có nhân vật (Mục 1) mà chưa có masterCharacterText
    // (tab link sẽ tự override bằng masterCastPrompt sau bước xác nhận MasterCastPanel),
    // tự build khối nhận diện nhân vật để chèn vào mọi cảnh, giữ nhất quán ngoại hình.
    const masterCharacterText = body.veoInput.masterCharacterText?.trim()
      || buildCharacterIdentityText(body.geminiInput.characters ?? body.veoInput.characters);
    return ok(c, {
      script,
      veoInput: { ...body.veoInput, masterCharacterText },
      ttsInput: body.ttsInput,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi gọi Gemini';
    return fail(c, message, 500);
  }
});

/**
 * POST /api/gemini/describe-character-sheet
 * Gemini Vision — phân tích ảnh Character Sheet vừa upload, trả mô tả text chi
 * tiết dùng làm "master character" chèn vào prompt mọi cảnh (giữ nhất quán).
 */
geminiRoute.post('/describe-character-sheet', async (c) => {
  try {
    const body = await c.req.json<DescribeCharacterSheetBody>();

    if (!body.imageBase64?.trim()) {
      return fail(c, 'Thiếu ảnh Character Sheet.', 400);
    }

    const description = await describeCharacterSheet({
      apiKey: body.apiKey,
      imageBase64: body.imageBase64,
      imageMimeType: body.imageMimeType,
    });

    return ok(c, { description });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi phân tích ảnh Character Sheet';
    return fail(c, message, 500);
  }
});
