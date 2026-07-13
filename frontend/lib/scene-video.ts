// ─── Tạo clip video cảnh qua Veo API (hoặc placeholder) ──────────────────────

import type { VideoScene } from '@/lib/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { generateSceneVideoAsset, type SceneVideoCallbacks } from '@/lib/veo-generation';
import { createScenePlaceholderVideo, revokeSceneVideoUrl } from '@/lib/scene-video-placeholder';

/** Tạo clip video cảnh — Veo: start 1 lần → poll → download */
export async function createSceneVideo(
  scene: VideoScene,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
): Promise<string> {
  const apiKey = veoInput.apiKey?.trim();
  const quality = veoInput.videoQuality ?? '720p';

  if (apiKey) {
    const { videoUrl } = await generateSceneVideoAsset(scene, veoInput, callbacks);
    return videoUrl;
  }

  return createScenePlaceholderVideo(scene, quality);
}

export { revokeSceneVideoUrl };
