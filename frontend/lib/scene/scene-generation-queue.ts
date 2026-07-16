// ─── Hàng đợi sinh cảnh: TTS → Veo tuần tự, cập nhật UI từng bước ───────────

import type { VideoScene } from '@/lib/scene/scenes';
import { recalculateSceneTimings } from '@/lib/scene/scenes';
import { attachAudioToSingleScene } from '@/lib/scene/scene-tts';
import { createSceneVideo } from '@/lib/scene/scene-video';
import { isFatalVeoError, sceneNeedsVeoResume } from '@/lib/veo/veo-generation';
import { isFatalKieError, sceneNeedsKieResume } from '@/lib/kie/kie-generation';
import { isSceneStopped, clearSceneStopped, SceneStoppedError } from '@/lib/veo/veo-generation-lock';
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
  // Đánh dấu 'generating' cho mọi cảnh chưa xong ngay từ đầu — UI hiện spinner
  // "Đang tạo..." cho cả loạt cảnh cùng lúc, dù thực tế xử lý tuần tự bên dưới.
  let scenes: VideoScene[] = initialScenes.map((s) => {
    if (s.status === 'success' && s.videoUrl) return s;
    if (sceneNeedsVeoResume(s) || sceneNeedsKieResume(s)) return s;
    return { ...s, status: 'generating' as const };
  });

  callbacks.onScenesUpdate(scenes);

  for (let i = 0; i < scenes.length; i++) {
    // Epoch đổi (video bị hủy/chạy lại) — dừng ngay, không đụng tới scenes vì
    // đã có 1 lượt runSceneGenerationQueue mới (epoch mới) đang tự quản lý rồi.
    if (callbacks.shouldContinue && !callbacks.shouldContinue()) break;

    const scene = scenes[i];

    // Cảnh đã có video thành công từ trước (resume/regenerate 1 phần) — bỏ qua,
    // giữ nguyên video cũ hiển thị, không tạo lại.
    if (scene.status === 'success' && scene.videoUrl) {
      queueItems[i] = { ...queueItems[i], step: 'done' };
      callbacks.onQueueUpdate?.([...queueItems]);
      continue;
    }

    // User đã bấm "Dừng" cho cảnh này (kể cả trước khi queue kịp xử lý tới) — bỏ qua,
    // không tạo, đánh dấu lỗi rõ ràng thay vì hiện spinner mãi.
    if (isSceneStopped(scene.id)) {
      clearSceneStopped(scene.id);
      const stopped: VideoScene = {
        ...scene,
        status: 'error' as const,
        errorMessage: 'Đã dừng theo yêu cầu.',
        veoOperationName: undefined,
        kieTaskId: undefined,
      };
      queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: 'Đã dừng theo yêu cầu.' };
      scenes = patchSceneAt(scenes, i, stopped);
      callbacks.onQueueUpdate?.([...queueItems]);
      callbacks.onScenesUpdate([...scenes]);
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
        // TTS lỗi — CHỈ cảnh này hiện badge "Lỗi" + errorMessage, không dừng
        // queue: nhảy sang cảnh kế tiếp (continue), các cảnh sau vẫn tạo bình thường.
        const message = toUserMessage(err, 'Tạo giọng đọc (TTS) thất bại — thử lại.');
        // Xoá luôn operationId nếu có sót từ trước — cảnh đã lỗi, không tự resume nữa.
        working = { ...working, status: 'error' as const, errorMessage: message, veoOperationName: undefined, kieTaskId: undefined };
        queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
        scenes = patchSceneAt(scenes, i, working);
        callbacks.onQueueUpdate?.([...queueItems]);
        callbacks.onScenesUpdate([...scenes]);
        continue;
      }

      // TTS xong — vẫn hiện spinner "Đang tạo..." (chuyển sang bước tạo video Veo)
      scenes = patchSceneAt(scenes, i, { ...working, status: 'generating' as const });
      callbacks.onScenesUpdate([...scenes]);
    }

    // Kiểm tra lại — user có thể đã bấm "Dừng" TRONG lúc TTS đang chạy (cờ dừng chỉ
    // được check ở đầu vòng lặp, trước TTS). Nếu không check lại ở đây,
    // generateSceneVideoAsset/Kie sắp gọi bên dưới sẽ tự xoá cờ dừng này (clearSceneStopped
    // cho lượt tạo mới) và âm thầm tạo video dù user đã yêu cầu dừng.
    if (isSceneStopped(scene.id)) {
      clearSceneStopped(scene.id);
      const stopped: VideoScene = {
        ...working,
        status: 'error' as const,
        errorMessage: 'Đã dừng theo yêu cầu.',
        veoOperationName: undefined,
        kieTaskId: undefined,
      };
      queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: 'Đã dừng theo yêu cầu.' };
      scenes = patchSceneAt(scenes, i, stopped);
      callbacks.onQueueUpdate?.([...queueItems]);
      callbacks.onScenesUpdate([...scenes]);
      callbacks.onPersistScenes?.([...scenes]);
      continue;
    }

    queueItems[i] = { ...queueItems[i], step: 'video' };
    callbacks.onQueueUpdate?.([...queueItems]);

    let finished: VideoScene;
    try {
      const videoUrl = await createSceneVideo(working, veoInput, {
        // Đã start (predictLongRunning / createTask) — lưu operationName/taskId ngay
        // để nếu user refresh giữa chừng thì lần load sau resume poll tiếp, không
        // start lại (không tốn thêm 1 lần generate). UI vẫn đang hiện spinner lúc này.
        onOperationStarted: (operationId) => {
          const patched: VideoScene = veoInput.provider === 'kie'
            ? { ...working, kieTaskId: operationId, status: 'generating' }
            : { ...working, veoOperationName: operationId, status: 'generating' };
          working = patched;
          scenes = patchSceneAt(scenes, i, patched);
          callbacks.onScenesUpdate([...scenes]);
          callbacks.onPersistScenes?.([...scenes]);
        },
      });

      // Thành công — hiện video thật đã tạo xong, hết spinner.
      finished = {
        ...working,
        videoUrl,
        veoOperationName: undefined,
        kieTaskId: undefined,
        // Video mới sinh — path Storage cũ (nếu có) không còn đại diện đúng nội
        // dung này, phải lưu lại từ đầu qua nút "Lưu video".
        videoPath: undefined,
        status: 'success' as const,
        errorMessage: undefined,
      };
      queueItems[i] = { ...queueItems[i], step: 'done' };
    } catch (err) {
      // User bấm "Dừng" giữa lúc đang poll — không phải lỗi thật, không dừng cả queue,
      // chỉ đánh dấu đúng cảnh này rồi tiếp tục các cảnh sau bình thường.
      if (err instanceof SceneStoppedError) {
        const stopped: VideoScene = {
          ...working,
          status: 'error' as const,
          errorMessage: err.message,
          veoOperationName: undefined,
          kieTaskId: undefined,
        };
        queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: err.message };
        scenes = patchSceneAt(scenes, i, stopped);
        callbacks.onQueueUpdate?.([...queueItems]);
        callbacks.onScenesUpdate([...scenes]);
        callbacks.onPersistScenes?.([...scenes]);
        continue;
      }

      const rawMessage = err instanceof Error ? err.message : 'Tạo video thất bại';
      const message = toUserMessage(
        err,
        veoInput.provider === 'kie' ? 'Tạo video Grok Imagine thất bại — thử lại.' : 'Tạo video Veo thất bại — thử lại.',
      );
      const fatalFlag = Boolean((err as Error & { fatal?: boolean }).fatal);
      const isFatal = veoInput.provider === 'kie'
        ? isFatalKieError(rawMessage, fatalFlag)
        : isFatalVeoError(rawMessage, fatalFlag);

      // Lỗi nghiêm trọng (hết quota/billing/API key sai...) — không có ích gì khi
      // thử tiếp các cảnh sau vì chắc chắn cũng lỗi y hệt. Cảnh này VÀ toàn bộ
      // cảnh phía sau đều chuyển sang hiện badge "Lỗi", dừng hẳn queue.
      if (isFatal) {
        callbacks.onFatalError?.(message);
        // Xoá operationId — cảnh đã kết luận LỖI, không được coi là "còn đang chạy"
        // nữa, nếu không lần load sau sceneNeedsVeoResume sẽ hiểu nhầm và tự gọi
        // lại API dù user chưa yêu cầu (tuyệt đối không được tự resume cảnh đã lỗi).
        finished = { ...working, status: 'error' as const, errorMessage: message, veoOperationName: undefined, kieTaskId: undefined };
        queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
        scenes = patchSceneAt(scenes, i, finished);

        // Các cảnh phía sau chưa kịp xử lý — vẫn đang ở status 'generating' được
        // set sẵn lúc khởi tạo queue (để hiện spinner cả loạt ngay từ đầu). Dừng
        // queue ở đây thì phải đánh dấu lại, nếu không UI sẽ hiện loading mãi mãi
        // dù thực ra chưa từng được gọi tạo.
        const stoppedMessage = 'Chưa tạo — đã dừng do lỗi nghiêm trọng ở cảnh trước.';
        scenes = scenes.map((s, j) =>
          j > i && s.status === 'generating'
            ? { ...s, status: 'error' as const, errorMessage: stoppedMessage, veoOperationName: undefined, kieTaskId: undefined }
            : s,
        );
        for (let j = i + 1; j < queueItems.length; j++) {
          if (queueItems[j].step !== 'done') {
            queueItems[j] = { ...queueItems[j], step: 'error', errorMessage: stoppedMessage };
          }
        }

        callbacks.onQueueUpdate?.([...queueItems]);
        callbacks.onScenesUpdate([...scenes]);
        break;
      }

      // Lỗi Veo không nghiêm trọng (timeout, lỗi tạm...) — CHỈ cảnh này hiện
      // badge "Lỗi" + errorMessage, các cảnh phía sau vẫn tiếp tục tạo bình thường.
      // Xoá operationId — dù lỗi tạm, cảnh này đã có kết luận, không tự resume nữa;
      // user phải chủ động bấm "Tạo lại" nếu muốn thử lại (không tự gọi API ngầm).
      finished = { ...working, status: 'error' as const, errorMessage: message, veoOperationName: undefined, kieTaskId: undefined };
      queueItems[i] = { ...queueItems[i], step: 'error', errorMessage: message };
      scenes = patchSceneAt(scenes, i, finished);
      callbacks.onQueueUpdate?.([...queueItems]);
      callbacks.onScenesUpdate([...scenes]);
      callbacks.onPersistScenes?.([...scenes]);
      continue;
    }

    // Cảnh vừa xong (thành công) — patch vào scenes rồi mới xử lý cảnh kế tiếp.
    scenes = patchSceneAt(scenes, i, finished);
    callbacks.onQueueUpdate?.([...queueItems]);
    callbacks.onScenesUpdate([...scenes]);
  }

  return scenes;
}

/** Cảnh cần resume poll sau refresh — Veo hoặc Grok Imagine (kie.ai) */
export function scenesNeedingVeoResume(scenes: VideoScene[]): VideoScene[] {
  return scenes.filter((s) => sceneNeedsVeoResume(s) || sceneNeedsKieResume(s));
}
