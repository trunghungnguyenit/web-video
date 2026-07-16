// ─── Điều phối Grok Imagine (kie.ai): createTask 1 lần → poll recordInfo → fetch URL công khai ───

import type { VideoScene } from '@/lib/scene/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { kieService } from '@/services/kie/kie.service';
import { withKieConcurrency } from '@/lib/veo/veo-concurrency';
import {
  withOperationPollLock,
  withSceneVideoLock,
  isSceneStopped,
  clearSceneStopped,
  SceneStoppedError,
} from '@/lib/veo/veo-generation-lock';
import type { SceneVideoCallbacks } from '@/lib/veo/veo-generation';
import { isFatalErrorMessage } from '@/lib/veo/fatal-error-patterns';

export const KIE_POLL_INTERVAL_MS = 10_000;
/** Nới rộng hơn Veo (10 phút) — duration Grok Imagine tối đa 30s có thể lâu hơn */
export const KIE_MAX_POLL_MS = 15 * 60 * 1000;
export const KIE_MAX_POLLS = Math.floor(KIE_MAX_POLL_MS / KIE_POLL_INTERVAL_MS);

export const isFatalKieError = isFatalErrorMessage;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll recordInfo — poll ngay lần đầu, sau đó mỗi 10s, timeout 15 phút */
async function pollUntilDone(apiKey: string, taskId: string, sceneId: string): Promise<string> {
  return withOperationPollLock(taskId, async () => {
    for (let i = 0; i < KIE_MAX_POLLS; i++) {
      if (i > 0) await sleep(KIE_POLL_INTERVAL_MS);

      if (isSceneStopped(sceneId)) throw new SceneStoppedError();

      const status = await kieService.pollTask({ apiKey, taskId });

      if (status.error) {
        throw new Error(status.error);
      }

      if (status.done && status.videoUrl) {
        return status.videoUrl;
      }
    }

    throw new Error('Grok Imagine quá thời gian chờ — thử lại sau.');
  });
}

/**
 * Tạo video cho 1 cảnh qua Grok Imagine:
 * - Đã có videoUrl → bỏ qua
 * - Có kieTaskId → chỉ poll (resume sau refresh)
 * - Chưa có → tạo task 1 lần rồi poll
 */
export async function generateSceneVideoAssetKie(
  scene: VideoScene,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
): Promise<{ videoUrl: string; kieTaskId?: string }> {
  const apiKey = veoInput.apiKey?.trim();
  if (!apiKey) {
    throw new Error('Thiếu Kie.ai API Key.');
  }

  if (scene.videoUrl && scene.status === 'success' && !callbacks?.forceNew) {
    return { videoUrl: scene.videoUrl, kieTaskId: scene.kieTaskId };
  }

  // Bắt đầu 1 lượt tạo mới (kể cả resume) — cờ "đã dừng" từ lần trước (nếu có) không còn áp dụng
  clearSceneStopped(scene.id);

  return withSceneVideoLock(scene.id, async () => {
    let taskId = !callbacks?.forceNew ? scene.kieTaskId?.trim() : undefined;

    if (!taskId) {
      if (isSceneStopped(scene.id)) throw new SceneStoppedError();

      const started = await withKieConcurrency(() =>
        kieService.startGeneration({
          apiKey,
          prompt: scene.prompt,
          aspectRatio: veoInput.aspectRatio,
          durationSeconds: scene.durationSeconds,
          mode: veoInput.kieMode,
          resolution: veoInput.videoQuality,
        }),
      );
      taskId = started.taskId;
      callbacks?.onOperationStarted?.(taskId);
    }

    try {
      const resultUrl = await pollUntilDone(apiKey, taskId, scene.id);
      // Tải qua backend proxy — tránh phụ thuộc CORS của CDN kie.ai khi fetch thẳng
      // từ trình duyệt (khác nhánh cũ: có thể fail ở bước cuối sau khi đã tốn phí render).
      const blob = await kieService.downloadVideo({ videoUrl: resultUrl });
      const videoUrl = URL.createObjectURL(blob);
      return { videoUrl, kieTaskId: undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tạo video thất bại';
      throw err instanceof Error ? err : new Error(message);
    }
  });
}

/** Cảnh đang chờ poll (refresh) — có task nhưng chưa có video, CHƯA có kết luận */
export function sceneNeedsKieResume(scene: VideoScene): boolean {
  // CHỈ resume cảnh 'generating' thật sự — cảnh đã 'error' KHÔNG tự resume/gọi lại
  // API dù còn sót taskId (dữ liệu cũ hoặc bug khác) — user phải chủ động "Tạo lại".
  return Boolean(scene.kieTaskId?.trim() && !scene.videoUrl && scene.status === 'generating');
}
