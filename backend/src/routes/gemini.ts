import { Hono } from 'hono';
import { ok, fail } from '../utils/api-response';
import { analyzeContent } from '../services/gemini.service';
import type { AnalyzePipelineRequest } from '../types/pipeline';

export const geminiRoute = new Hono();

/**
 * POST /api/gemini/analyze
 * Body: { geminiInput, veoInput, ttsInput }
 * Bước 1: Gemini tạo kịch bản — veoInput/ttsInput echo lại cho bước 2 & 3
 */
geminiRoute.post('/analyze', async (c) => {
  try {
    const body = await c.req.json<AnalyzePipelineRequest>();

    if (!body.geminiInput?.apiKey?.trim()) {
      return fail(c, 'Thiếu Gemini API Key — nhập tại mục API Keys.');
    }
    if (!body.geminiInput?.content?.trim()) {
      return fail(c, 'Nội dung không được để trống.');
    }
    if (!body.veoInput || !body.ttsInput) {
      return fail(c, 'Thiếu veoInput hoặc ttsInput.');
    }

    console.log('[gemini/analyze] Nhận request:', {
      inputType: body.geminiInput.inputType,
      sceneCount: body.geminiInput.sceneCount,
      language: body.geminiInput.language,
      videoType: body.geminiInput.videoType,
      contentLength: body.geminiInput.content.length,
      characterCount: body.geminiInput.characters?.length ?? 0,
      veo: {
        aspectRatio: body.veoInput.aspectRatio,
        sceneDuration: body.veoInput.sceneDuration,
        videoQuality: body.veoInput.videoQuality,
        veoModel: body.veoInput.veoModel,
      },
    });
    console.log('[gemini/analyze] content:\n', body.geminiInput.content);

    const script = await analyzeContent(body);
    return ok(c, {
      script,
      veoInput: body.veoInput,
      ttsInput: body.ttsInput,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi khi gọi Gemini';
    return fail(c, message, 500);
  }
});
