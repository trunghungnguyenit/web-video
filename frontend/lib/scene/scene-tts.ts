// ─── ElevenLabs TTS cho từng cảnh — gắn audioUrl + duration ──────────────────

import type { VideoScene } from '@/lib/scene/scenes';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import { ttsService } from '@/services/tts/tts.service';
import { revokeSceneVideoUrl } from '@/lib/scene/scene-video-placeholder';
import { createSceneVideo } from '@/lib/scene/scene-video';
import type { SceneVideoCallbacks } from '@/lib/veo/veo-generation';
import { toUserMessage } from '@/lib/error-messages';

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
  if (!audioUrl) return { ...scene, audioUrl: undefined, audioPath: undefined };

  // Audio mới sinh — audioPath cũ (nếu có) không còn đại diện đúng nội dung này.
  try {
    const audioLen = await getAudioDurationSeconds(audioUrl);
    return {
      ...scene,
      audioUrl,
      audioPath: undefined,
      audioDurationSeconds: audioLen,
      durationSeconds: durationForAudio(scene.durationSeconds, audioLen),
    };
  } catch {
    return { ...scene, audioUrl, audioPath: undefined };
  }
}

/** TTS + video placeholder cho một cảnh (sau khi sửa prompt/voice) */
export async function regenerateSceneAssets(
  scene: VideoScene,
  ttsInput: TtsInput,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
  /** Scene Continuity — videoUrl cảnh liền trước (trích khung hình cuối làm khung đầu) */
  previousSceneVideoUrl?: string,
): Promise<VideoScene> {
  revokeSceneVideoUrl(scene.videoUrl);

  let next: VideoScene;
  try {
    if (ttsInput.enabled === false) {
      next = { ...scene, audioUrl: undefined, audioPath: undefined };
    } else {
      next = await attachAudioToSingleScene(scene, ttsInput);
    }
  } catch {
    next = { ...scene, audioUrl: undefined, audioPath: undefined };
  }

  try {
    const videoUrl = await createSceneVideo(
      { ...next, veoOperationName: undefined },
      veoInput,
      {
        forceNew: true,
        onOperationStarted: (operationId) => {
          callbacks?.onOperationStarted?.(operationId);
        },
      },
      previousSceneVideoUrl,
    );
    return {
      ...next,
      videoUrl,
      // Thành công — xoá operationId; cảnh sau nối tiếp bằng khung hình cuối của videoUrl này.
      veoOperationName: undefined,
      videoPath: undefined,
      status: 'success',
    };
  } catch (err) {
    // Cảnh đã kết luận LỖI — không giữ lại operationId vừa start được, để lần load
    // sau KHÔNG tự resume/gọi API ngầm; user phải chủ động bấm "Tạo lại" mới thử lại.
    return {
      ...next,
      videoUrl: undefined,
      veoOperationName: undefined,
      status: 'error',
      errorMessage: toUserMessage(err, 'Tạo lại cảnh thất bại — thử lại.'),
    };
  }
}
