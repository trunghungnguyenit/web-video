// ─── Tạo clip video cảnh qua Veo API (hoặc placeholder) ──────────────────────

import type { VideoScene } from '@/lib/scene/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { generateSceneVideoAsset, type SceneVideoCallbacks } from '@/lib/veo/veo-generation';
import { generateSceneVideoAssetKie } from '@/lib/kie/kie-generation';
import { createScenePlaceholderVideo, revokeSceneVideoUrl } from '@/lib/scene/scene-video-placeholder';

/** Tạo clip video cảnh — Veo hoặc Grok Imagine (kie.ai): start 1 lần → poll → lấy video */
export async function createSceneVideo(
  scene: VideoScene,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
  /** Scene Continuity (Video Extension, Veo 3.1) — videoUrl cảnh liền trước, chỉ áp dụng cho Veo */
  previousSceneVideoUrl?: string,
): Promise<string> {
  const apiKey = veoInput.apiKey?.trim();
  const quality = veoInput.videoQuality ?? '720p';

  if (apiKey && veoInput.provider === 'kie') {
    const { videoUrl } = await generateSceneVideoAssetKie(scene, veoInput, callbacks);
    return videoUrl;
  }

  if (apiKey) {
    const { videoUrl } = await generateSceneVideoAsset(scene, veoInput, callbacks, previousSceneVideoUrl);
    return videoUrl;
  }

  return createScenePlaceholderVideo(scene, quality);
}

export { revokeSceneVideoUrl };
