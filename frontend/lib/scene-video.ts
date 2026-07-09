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

/** Gắn video cho các cảnh — tuần tự, không song song */
export async function attachVideosToScenes(
  scenes: VideoScene[],
  veoInput: VeoInput,
): Promise<VideoScene[]> {
  const results: VideoScene[] = [];

  for (const scene of scenes) {
    if (scene.status !== 'success' && scene.status !== 'edited') {
      results.push(scene);
      continue;
    }

    revokeSceneVideoUrl(scene.videoUrl);
    try {
      const videoUrl = await createSceneVideo(scene, veoInput, { forceNew: true });
      results.push({ ...scene, videoUrl, veoOperationName: undefined, status: 'success' as const });
    } catch {
      results.push({ ...scene, videoUrl: undefined, veoOperationName: undefined, status: 'error' as const });
    }
  }

  return results;
}

export { revokeSceneVideoUrl };
