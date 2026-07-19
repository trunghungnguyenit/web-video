// ─── Điều phối Veo: start 1 lần → poll operations → download ────────────────

import type { VideoScene } from '@/lib/scene/scenes';
import type { VeoInput } from '@/lib/pipeline-payload';
import { buildScenePrompt } from '@/lib/pipeline-payload';
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
import { fetchVideoAsBase64, trimToLastSeconds } from '@/lib/veo/scene-continuity';

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
  /**
   * Scene Continuity (Video Extension, Veo 3.1) — videoUrl của cảnh liền TRƯỚC (không
   * phải cảnh 1). Chỉ dùng khi veoInput.sceneContinuity bật; provider khác Veo (Kie) hoặc
   * cảnh 1 thì bỏ qua tham số này (undefined).
   */
  previousSceneVideoUrl?: string,
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
    // Google trả về file GỘP (video cảnh trước + đoạn mới) khi dùng Video Extension — phải
    // cắt lại chỉ giữ đoạn mới sau khi tải xong. Tính theo tham số truyền vào (không phụ
    // thuộc nhánh start-mới hay resume) để đúng cả khi resume poll sau khi refresh trang.
    const usedContinuity = Boolean(veoInput.sceneContinuity && previousSceneVideoUrl);

    if (!operationName) {
      if (isSceneStopped(scene.id)) throw new SceneStoppedError();

      const referenceImage = veoInput.referenceImage?.base64 && veoInput.referenceImage?.mimeType
        ? veoInput.referenceImage
        : undefined;
      const characterImage = veoInput.characters?.find((c) => c.imageBase64 && c.imageMimeType);
      const previousVideo = usedContinuity && previousSceneVideoUrl
        ? await fetchVideoAsBase64(previousSceneVideoUrl)
        : undefined;
      console.log('[veo/generate] Master Cast / continuity check:', {
        sceneId: scene.id,
        hasSceneSourceImage: Boolean(scene.sourceImageBase64),
        hasReferenceImage: Boolean(referenceImage),
        hasCharacterImage: Boolean(characterImage?.imageBase64),
        sceneContinuityEnabled: Boolean(veoInput.sceneContinuity),
        usedContinuity,
        characterNames: veoInput.characters?.map((c) => c.name) ?? [],
      });

      const started = await withVeoConcurrency(() =>
        veoService.startGeneration({
          apiKey,
          prompt: buildScenePrompt(scene.prompt, veoInput.masterCharacterText),
          veoInput,
          durationSeconds: scene.durationSeconds,
          image: scene.sourceImageBase64 && scene.sourceImageMimeType
            ? { base64: scene.sourceImageBase64, mimeType: scene.sourceImageMimeType }
            : undefined,
          previousVideo,
        }),
      );
      operationName = started.operationName;
      callbacks?.onOperationStarted?.(operationName);
    }

    // Không bọc try/catch riêng — pollUntilDone/downloadVideo throw gì thì để nguyên
    // vậy propagate lên caller (scene-generation-queue.ts tự phân loại fatal/stop/retry).
    const videoUri = await pollUntilDone(apiKey, operationName, scene.id);
    const blob = await veoService.downloadVideo({ apiKey, videoUri });
    // Video Extension trả file gộp (cảnh trước + cảnh mới) — cắt lại đúng 8s cuối để
    // lưu trữ đúng 1 clip riêng cho cảnh này, không lặp lại nội dung cảnh trước.
    const finalBlob = usedContinuity ? await trimToLastSeconds(blob, 8) : blob;
    const videoUrl = URL.createObjectURL(finalBlob);
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
