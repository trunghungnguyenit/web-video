// ─── ElevenLabs TTS cho từng cảnh — gắn audioUrl + duration ──────────────────

import type { VideoScene } from '@/lib/scenes';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import { ttsService } from '@/services/tts.service';
import { revokeSceneVideoUrl } from '@/lib/scene-video-placeholder';
import { createSceneVideo } from '@/lib/scene-video';
import type { SceneVideoCallbacks } from '@/lib/veo-generation';

/** Thu hồi blob URL audio TTS (tránh rò bộ nhớ) */
function revokeSceneAudioUrl(url?: string) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

/** Đọc metadata audio blob → độ dài giây */
function getAudioDurationSeconds(blobUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      audio.removeAttribute('src');
      audio.load();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Không đọc được độ dài audio'));
        return;
      }
      resolve(duration);
    };
    audio.onerror = () => reject(new Error('Không load được metadata audio'));
    audio.src = blobUrl;
  });
}

/** Cập nhật durationSeconds cảnh theo độ dài audio (+ buffer 0.5s) */
function durationForAudio(baseSeconds: number, audioSeconds: number): number {
  const needed = Math.ceil((audioSeconds + 0.5) * 10) / 10;
  return Math.max(baseSeconds, needed);
}

/** Gọi ElevenLabs TTS → trả blob URL audio (undefined nếu voice rỗng) */
async function synthesizeSceneAudio(
  scene: Pick<VideoScene, 'voice'>,
  ttsInput: TtsInput,
  apiKey: string,
): Promise<string | undefined> {
  const text = scene.voice.trim();
  if (!text) return undefined;
  const blob = await ttsService.synthesize({ apiKey, text, ttsInput });
  return URL.createObjectURL(blob);
}

/** TTS một cảnh + cập nhật duration theo độ dài audio */
export async function attachAudioToSingleScene(
  scene: VideoScene,
  ttsInput: TtsInput,
): Promise<VideoScene> {
  const apiKey = ttsInput.apiKey?.trim();
  if (!apiKey) return scene;

  revokeSceneAudioUrl(scene.audioUrl);
  const audioUrl = await synthesizeSceneAudio(scene, ttsInput, apiKey);
  if (!audioUrl) return { ...scene, audioUrl: undefined };

  try {
    const audioLen = await getAudioDurationSeconds(audioUrl);
    return {
      ...scene,
      audioUrl,
      audioDurationSeconds: audioLen,
      durationSeconds: durationForAudio(scene.durationSeconds, audioLen),
    };
  } catch {
    return { ...scene, audioUrl };
  }
}

/** TTS + video placeholder cho một cảnh (sau khi sửa prompt/voice) */
export async function regenerateSceneAssets(
  scene: VideoScene,
  ttsInput: TtsInput,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
): Promise<VideoScene> {
  revokeSceneVideoUrl(scene.videoUrl);

  let next: VideoScene;
  try {
    next = await attachAudioToSingleScene(scene, ttsInput);
  } catch {
    next = { ...scene, audioUrl: undefined };
  }

  let startedOperation: string | undefined;
  try {
    const videoUrl = await createSceneVideo(
      { ...next, veoOperationName: undefined },
      veoInput,
      {
        forceNew: true,
        onOperationStarted: (operationName) => {
          startedOperation = operationName;
          callbacks?.onOperationStarted?.(operationName);
        },
      },
    );
    return { ...next, videoUrl, veoOperationName: undefined, status: 'success' };
  } catch {
    return {
      ...next,
      videoUrl: undefined,
      veoOperationName: startedOperation,
      status: 'error',
    };
  }
}
