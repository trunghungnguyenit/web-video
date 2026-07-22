// ─── Tạo clip video cảnh qua Veo API (hoặc placeholder) ──────────────────────

import type { VideoScene } from '@/lib/scene/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { generateSceneVideoAsset, type SceneVideoCallbacks } from '@/lib/veo/veo-generation';
import { createScenePlaceholderVideo, revokeSceneVideoUrl } from '@/lib/scene/scene-video-placeholder';

/**
 * Tạo clip video cảnh — Veo 3.1 (qua kie.ai hoặc gọi thẳng Google, xem veoInput.provider):
 * start 1 lần → poll → lấy video. Chưa có API key thì trả clip placeholder.
 */
export async function createSceneVideo(
  scene: VideoScene,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
  /** Scene Continuity — videoUrl cảnh liền trước (trích khung hình cuối làm khung đầu) */
  previousSceneVideoUrl?: string,
): Promise<string> {
  const apiKey = veoInput.apiKey?.trim();
  const quality = veoInput.videoQuality ?? '720p';

  if (apiKey) {
    const { videoUrl } = await generateSceneVideoAsset(scene, veoInput, callbacks, previousSceneVideoUrl);
    return videoUrl;
  }

  return createScenePlaceholderVideo(scene, quality);
}

export { revokeSceneVideoUrl };
