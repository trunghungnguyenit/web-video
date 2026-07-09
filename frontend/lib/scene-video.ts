// ─── Tạo clip video cảnh qua Veo API (hoặc placeholder) ──────────────────────

import type { VideoScene } from '@/lib/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { veoService } from '@/services/veo.service';
import { createScenePlaceholderVideo, revokeSceneVideoUrl } from '@/lib/scene-video-placeholder';

/** Tạo clip video cảnh — Veo API nếu có key, không thì placeholder WebM */
export async function createSceneVideo(
  scene: VideoScene,
  veoInput: VeoInput,
): Promise<string> {
  const apiKey = veoInput.apiKey?.trim();
  const quality = veoInput.videoQuality ?? '720p';

  if (apiKey) {
    const blob = await veoService.generate({
      apiKey,
      prompt: scene.prompt,
      veoInput,
      durationSeconds: scene.durationSeconds,
    });
    return URL.createObjectURL(blob);
  }

  return createScenePlaceholderVideo(scene, quality);
}

/** Gắn video cho các cảnh — Veo 3 nếu có API key, không thì placeholder */
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
      const videoUrl = await createSceneVideo(scene, veoInput);
      results.push({ ...scene, videoUrl, status: 'success' as const });
    } catch {
      results.push({ ...scene, videoUrl: undefined, status: 'error' as const });
    }
  }

  return results;
}

export { revokeSceneVideoUrl };
