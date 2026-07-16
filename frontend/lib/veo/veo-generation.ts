// ─── Điều phối Veo: start 1 lần → poll operations → download ────────────────

import type { VideoScene } from '@/lib/scene/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { veoService } from '@/services/veo/veo.service';
import { withVeoConcurrency } from '@/lib/veo/veo-concurrency';
import {
  withOperationPollLock,
  withSceneVideoLock,
  isSceneStopped,
  clearSceneStopped,
  SceneStoppedError,
} from '@/lib/veo/veo-generation-lock';
import { isFatalErrorMessage } from '@/lib/veo/fatal-error-patterns';

export const VEO_POLL_INTERVAL_MS = 10_000;
export const VEO_MAX_POLL_MS = 10 * 60 * 1000;
export const VEO_MAX_POLLS = Math.floor(VEO_MAX_POLL_MS / VEO_POLL_INTERVAL_MS);

export const isFatalVeoError = isFatalErrorMessage;

export interface SceneVideoCallbacks {
  /** Gọi ngay sau start — lưu operationName trước khi poll (persist + resume refresh) */
  onOperationStarted?: (operationName: string) => void;
  /** Bắt buộc tạo mới — xóa operation cũ (regenerate) */
  forceNew?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll operations.get — poll ngay lần đầu, sau đó mỗi 10s, timeout 10 phút */
async function pollUntilDone(apiKey: string, operationName: string, sceneId: string): Promise<string> {
  return withOperationPollLock(operationName, async () => {
    for (let i = 0; i < VEO_MAX_POLLS; i++) {
      if (i > 0) await sleep(VEO_POLL_INTERVAL_MS);

      if (isSceneStopped(sceneId)) throw new SceneStoppedError();

      const status = await veoService.pollOperation({ apiKey, operationName });

      if (status.error) {
        throw new Error(status.error);
      }

      if (status.done && status.videoUri) {
        return status.videoUri;
      }
    }

    throw new Error('Veo quá thời gian chờ — thử lại sau.');
  });
}

/**
 * Tạo video cho 1 cảnh:
 * - Đã có videoUrl → bỏ qua
 * - Có veoOperationName → chỉ poll (resume sau refresh)
 * - Chưa có → start 1 lần rồi poll
 */
export async function generateSceneVideoAsset(
  scene: VideoScene,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
): Promise<{ videoUrl: string; veoOperationName?: string }> {
  const apiKey = veoInput.apiKey?.trim();
  if (!apiKey) {
    throw new Error('Thiếu Veo API Key.');
  }

  if (scene.videoUrl && scene.status === 'success' && !callbacks?.forceNew) {
    return { videoUrl: scene.videoUrl, veoOperationName: scene.veoOperationName };
  }

  // Bắt đầu 1 lượt tạo mới (kể cả resume) — cờ "đã dừng" từ lần trước (nếu có) không còn áp dụng
  clearSceneStopped(scene.id);

  return withSceneVideoLock(scene.id, async () => {
    let operationName = !callbacks?.forceNew ? scene.veoOperationName?.trim() : undefined;

    if (!operationName) {
      if (isSceneStopped(scene.id)) throw new SceneStoppedError();

      const started = await withVeoConcurrency(() =>
        veoService.startGeneration({
          apiKey,
          prompt: scene.prompt,
          veoInput,
          durationSeconds: scene.durationSeconds,
          image: scene.sourceImageBase64 && scene.sourceImageMimeType
            ? { base64: scene.sourceImageBase64, mimeType: scene.sourceImageMimeType }
            : undefined,
        }),
      );
      operationName = started.operationName;
      callbacks?.onOperationStarted?.(operationName);
    }

    // Không bọc try/catch riêng — pollUntilDone/downloadVideo throw gì thì để nguyên
    // vậy propagate lên caller (scene-generation-queue.ts tự phân loại fatal/stop/retry).
    const videoUri = await pollUntilDone(apiKey, operationName, scene.id);
    const blob = await veoService.downloadVideo({ apiKey, videoUri });
    const videoUrl = URL.createObjectURL(blob);
    return { videoUrl, veoOperationName: undefined };
  });
}

/** Cảnh đang chờ poll (refresh / lỗi tạm) — có operation nhưng chưa có video */
export function sceneNeedsVeoResume(scene: VideoScene): boolean {
  // CHỈ resume cảnh thật sự chưa có kết luận ('generating' — app đóng/reload đúng
  // lúc đang chờ Veo trả kết quả). Cảnh đã 'error' KHÔNG được tự resume/gọi lại API
  // — dù còn sót operationId (dữ liệu cũ hoặc bug khác) — user phải chủ động bấm
  // "Tạo lại" mới thử lại, tuyệt đối không tự động.
  return Boolean(scene.veoOperationName?.trim() && !scene.videoUrl && scene.status === 'generating');
}
