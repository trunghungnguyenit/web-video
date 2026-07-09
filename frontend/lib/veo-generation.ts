// ─── Điều phối Veo: start 1 lần → poll operations → download ────────────────

import type { VideoScene } from '@/lib/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { veoService } from '@/services/veo.service';
import { withVeoConcurrency } from '@/lib/veo-concurrency';
import { withOperationPollLock, withSceneVideoLock } from '@/lib/veo-generation-lock';

export const VEO_POLL_INTERVAL_MS = 10_000;
export const VEO_MAX_POLL_MS = 10 * 60 * 1000;
export const VEO_MAX_POLLS = Math.floor(VEO_MAX_POLL_MS / VEO_POLL_INTERVAL_MS);

const FATAL_PATTERNS = [
  /billing/i,
  /quota/i,
  /resource.?exhausted/i,
  /permission/i,
  /api.?key/i,
  /invalid.?key/i,
  /exceeded/i,
  /payment/i,
  /suspended/i,
];

export function isFatalVeoError(message: string, fatalFlag?: boolean): boolean {
  if (fatalFlag) return true;
  return FATAL_PATTERNS.some((re) => re.test(message));
}

export interface SceneVideoCallbacks {
  /** Gọi ngay sau start — lưu operationName trước khi poll (persist + resume refresh) */
  onOperationStarted?: (operationName: string) => void;
  /** Bắt buộc tạo mới — xóa operation cũ (regenerate) */
  forceNew?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Poll operations.get mỗi 10s — dừng ngay khi DONE, timeout 10 phút */
async function pollUntilDone(apiKey: string, operationName: string): Promise<string> {
  return withOperationPollLock(operationName, async () => {
    for (let i = 0; i < VEO_MAX_POLLS; i++) {
      await sleep(VEO_POLL_INTERVAL_MS);

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

  return withSceneVideoLock(scene.id, async () => {
    let operationName = !callbacks?.forceNew ? scene.veoOperationName?.trim() : undefined;

    if (!operationName) {
      const started = await withVeoConcurrency(() =>
        veoService.startGeneration({
          apiKey,
          prompt: scene.prompt,
          veoInput,
          durationSeconds: scene.durationSeconds,
        }),
      );
      operationName = started.operationName;
      callbacks?.onOperationStarted?.(operationName);
    }

    try {
      const videoUri = await pollUntilDone(apiKey, operationName);
      const blob = await veoService.downloadVideo({ apiKey, videoUri });
      const videoUrl = URL.createObjectURL(blob);
      return { videoUrl, veoOperationName: undefined };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tạo video thất bại';
      const fatal = Boolean((err as Error & { fatal?: boolean }).fatal);
      if (isFatalVeoError(message, fatal)) {
        throw err instanceof Error ? err : new Error(message);
      }
      throw err instanceof Error ? err : new Error(message);
    }
  });
}

/** Cảnh đang chờ poll (refresh trang) — có operation nhưng chưa có video */
export function sceneNeedsVeoResume(scene: VideoScene): boolean {
  return Boolean(
    scene.veoOperationName?.trim()
    && !scene.videoUrl
    && scene.status === 'generating',
  );
}
