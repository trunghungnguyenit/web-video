import type { VideoScene } from '@/lib/scenes';
import { recalculateSceneTimings } from '@/lib/scenes';
import { attachAudioToSingleScene } from '@/lib/scene-tts';
import { createSceneVideo } from '@/lib/scene-video';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';

export type SceneQueueStep = 'pending' | 'tts' | 'video' | 'done' | 'error';

export interface SceneQueueItem {
  sceneId: string;
  index: number;
  prompt: string;
  voice: string;
  step: SceneQueueStep;
  errorMessage?: string;
}

export interface SceneQueueCallbacks {
  onScenesUpdate: (scenes: VideoScene[]) => void;
  onQueueUpdate?: (items: SceneQueueItem[]) => void;
}

function buildQueueItems(scenes: VideoScene[]): SceneQueueItem[] {
  return scenes.map((s) => ({
    sceneId: s.id,
    index: s.index,
    prompt: s.prompt,
    voice: s.voice,
    step: 'pending' as const,
  }));
}

/** Xử lý tuần tự từng cảnh: TTS → Veo/placeholder — cập nhật UI sau mỗi bước */
export async function runSceneGenerationQueue(
  initialScenes: VideoScene[],
  ttsInput: TtsInput,
  veoInput: VeoInput,
  callbacks: SceneQueueCallbacks,
): Promise<VideoScene[]> {
  const queueItems = buildQueueItems(initialScenes);
  let scenes: VideoScene[] = initialScenes.map((s) => ({ ...s, status: 'generating' as const }));

  callbacks.onScenesUpdate(scenes);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    queueItems[i] = { ...queueItems[i], step: 'tts', errorMessage: undefined };
    callbacks.onQueueUpdate?.([...queueItems]);

    let withAudio: VideoScene;
    try {
      withAudio = await attachAudioToSingleScene(scene, ttsInput);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS thất bại';
      withAudio = { ...scene, status: 'error' as const };
      queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
      scenes = recalculateSceneTimings(scenes.map((s, j) => (j === i ? withAudio : s)));
      callbacks.onQueueUpdate?.([...queueItems]);
      callbacks.onScenesUpdate([...scenes]);
      continue;
    }

    scenes = recalculateSceneTimings(scenes.map((s, j) => (j === i ? withAudio : s)));
    callbacks.onScenesUpdate([...scenes]);

    queueItems[i] = { ...queueItems[i], step: 'video' };
    callbacks.onQueueUpdate?.([...queueItems]);

    let finished: VideoScene;
    try {
      const videoUrl = await createSceneVideo(withAudio, veoInput);
      finished = { ...withAudio, videoUrl, status: 'success' as const };
      queueItems[i] = { ...queueItems[i], step: 'done' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tạo video thất bại';
      finished = { ...withAudio, videoUrl: undefined, status: 'error' as const };
      queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
    }

    scenes = recalculateSceneTimings(scenes.map((s, j) => (j === i ? finished : s)));
    callbacks.onQueueUpdate?.([...queueItems]);
    callbacks.onScenesUpdate([...scenes]);
  }

  return scenes;
}

export function queueProgress(items: SceneQueueItem[]): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => i.step === 'done' || i.step === 'error').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, percent };
}

export function isQueueRunning(items: SceneQueueItem[]): boolean {
  return items.some((i) => i.step === 'tts' || i.step === 'video');
}
