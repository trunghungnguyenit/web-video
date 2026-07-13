// ─── Hàng đợi sinh cảnh: TTS → Veo tuần tự, cập nhật UI từng bước ───────────

import type { VideoScene } from '@/lib/scenes';
import { recalculateSceneTimings } from '@/lib/scenes';
import { attachAudioToSingleScene } from '@/lib/scene-tts';
import { createSceneVideo } from '@/lib/scene-video';
import { isFatalVeoError, sceneNeedsVeoResume } from '@/lib/veo-generation';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import { toUserMessage } from '@/lib/error-messages';

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
  /** Lưu ngay veoOperationName — tránh mất khi refresh trong debounce persist */
  onPersistScenes?: (scenes: VideoScene[]) => void;
  /** Dừng toàn queue khi Billing/Quota */
  onFatalError?: (message: string) => void;
  /** Kiểm tra epoch — return false để hủy queue */
  shouldContinue?: () => boolean;
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

function patchSceneAt(scenes: VideoScene[], index: number, patch: VideoScene): VideoScene[] {
  return recalculateSceneTimings(scenes.map((s, j) => (j === index ? patch : s)));
}

/** Xử lý tuần tự từng cảnh — không gọi Veo song song, không generate trùng */
export async function runSceneGenerationQueue(
  initialScenes: VideoScene[],
  ttsInput: TtsInput,
  veoInput: VeoInput,
  callbacks: SceneQueueCallbacks,
): Promise<VideoScene[]> {
  const queueItems = buildQueueItems(initialScenes);
  let scenes: VideoScene[] = initialScenes.map((s) => {
    if (s.status === 'success' && s.videoUrl) return s;
    if (sceneNeedsVeoResume(s)) return s;
    return { ...s, status: 'generating' as const };
  });

  callbacks.onScenesUpdate(scenes);

  for (let i = 0; i < scenes.length; i++) {
    if (callbacks.shouldContinue && !callbacks.shouldContinue()) break;

    const scene = scenes[i];

    if (scene.status === 'success' && scene.videoUrl) {
      queueItems[i] = { ...queueItems[i], step: 'done' };
      callbacks.onQueueUpdate?.([...queueItems]);
      continue;
    }

    let working: VideoScene = { ...scene, errorMessage: undefined };

    const skipTts = Boolean(working.audioUrl);

    if (!skipTts) {
      queueItems[i] = { ...queueItems[i], step: 'tts', errorMessage: undefined };
      callbacks.onQueueUpdate?.([...queueItems]);

      try {
        working = await attachAudioToSingleScene(working, ttsInput);
      } catch (err) {
        const message = toUserMessage(err, 'Tạo giọng đọc (TTS) thất bại — thử lại.');
        working = { ...working, status: 'error' as const, errorMessage: message };
        queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
        scenes = patchSceneAt(scenes, i, working);
        callbacks.onQueueUpdate?.([...queueItems]);
        callbacks.onScenesUpdate([...scenes]);
        continue;
      }

      scenes = patchSceneAt(scenes, i, { ...working, status: 'generating' as const });
      callbacks.onScenesUpdate([...scenes]);
    }

    queueItems[i] = { ...queueItems[i], step: 'video' };
    callbacks.onQueueUpdate?.([...queueItems]);

    let finished: VideoScene;
    try {
      const videoUrl = await createSceneVideo(working, veoInput, {
        onOperationStarted: (operationName) => {
          const patched: VideoScene = {
            ...working,
            veoOperationName: operationName,
            status: 'generating',
          };
          working = patched;
          scenes = patchSceneAt(scenes, i, patched);
          callbacks.onScenesUpdate([...scenes]);
          callbacks.onPersistScenes?.([...scenes]);
        },
      });

      finished = {
        ...working,
        videoUrl,
        veoOperationName: undefined,
        status: 'success' as const,
        errorMessage: undefined,
      };
      queueItems[i] = { ...queueItems[i], step: 'done' };
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Tạo video thất bại';
      const message = toUserMessage(err, 'Tạo video Veo thất bại — thử lại.');

      if (isFatalVeoError(rawMessage, Boolean((err as Error & { fatal?: boolean }).fatal))) {
        callbacks.onFatalError?.(message);
        finished = { ...working, status: 'error' as const, errorMessage: message };
        queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
        scenes = patchSceneAt(scenes, i, finished);
        callbacks.onQueueUpdate?.([...queueItems]);
        callbacks.onScenesUpdate([...scenes]);
        break;
      }

      finished = { ...working, status: 'error' as const, errorMessage: message };
      queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
      scenes = patchSceneAt(scenes, i, finished);
      callbacks.onQueueUpdate?.([...queueItems]);
      callbacks.onScenesUpdate([...scenes]);
      callbacks.onPersistScenes?.([...scenes]);
      continue;
    }

    scenes = patchSceneAt(scenes, i, finished);
    callbacks.onQueueUpdate?.([...queueItems]);
    callbacks.onScenesUpdate([...scenes]);
  }

  return scenes;
}

/** Cảnh cần resume poll sau refresh */
export function scenesNeedingVeoResume(scenes: VideoScene[]): VideoScene[] {
  return scenes.filter(sceneNeedsVeoResume);
}
