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
import { extractLastFrameBase64 } from '@/lib/veo/last-frame';

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
async function pollUntilDone(
  apiKey: string,
  operationName: string,
  sceneId: string,
  quality?: string,
  provider?: VeoInput['provider'],
): Promise<string> {
  return withOperationPollLock(operationName, async () => {
    for (let i = 0; i < VEO_MAX_POLLS; i++) {
      if (i > 0) await sleep(VEO_POLL_INTERVAL_MS);

      if (isSceneStopped(sceneId)) throw new SceneStoppedError();

      const status = await veoService.pollOperation({ apiKey, operationName, quality, provider });

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
/**
 * Câu ràng buộc nối vào prompt khi dùng khung-hình-cuối cảnh trước làm khung đầu.
 *
 * QUAN TRỌNG: chỉ neo NHÂN DẠNG nhân vật (mặt/outfit/art style) — TUYỆT ĐỐI không được nói
 * "giữ nguyên bối cảnh/setting", vì scene prompt phía trên (Environment/Action/Camera do
 * Gemini sinh cho ĐÚNG cảnh này) có thể mô tả 1 bối cảnh/hành động khác hẳn cảnh trước (vd
 * cắt cảnh sang phòng khác). Nói "giữ nguyên setting" ở đây sẽ MÂU THUẪN trực tiếp với
 * "Environment: location: ..." đã viết ngay phía trên trong cùng 1 prompt, khiến model ưu
 * tiên bám khung hình neo thay vì làm theo mô tả cảnh mới → video trông như lặp lại cảnh cũ.
 */
const CONTINUITY_FRAME_NOTE =
  'The starting frame is only a visual anchor for character identity (faces, hairstyles, outfits, art style) carried over '
  + 'from the previous shot — it is NOT a constraint on setting or action. Follow the environment, action, and camera exactly '
  + 'as described in the scene prompt above, even if the location or activity is completely different from the starting frame '
  + '(treat it as a hard cut/new shot when the scene describes a new setting) — only the characters\' appearance and overall art style must stay consistent.';

export async function generateSceneVideoAsset(
  scene: VideoScene,
  veoInput: VeoInput,
  callbacks?: SceneVideoCallbacks,
  /**
   * Scene Continuity — videoUrl của cảnh liền TRƯỚC (không phải cảnh 1). Khi bật continuity,
   * trích khung hình CUỐI của video này làm khung đầu (first frame) cho cảnh hiện tại qua
   * /veo/generate FIRST_AND_LAST_FRAMES_2_VIDEO. Provider khác Veo (Kie) hoặc cảnh 1 thì
   * bỏ qua tham số này (undefined).
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

    if (!operationName) {
      if (isSceneStopped(scene.id)) throw new SceneStoppedError();

      // Ảnh nguồn riêng của cảnh (tab "Từ hình ảnh") — LUÔN ưu tiên cao nhất. Đây là ảnh
      // user chủ động chọn cho ĐÚNG cảnh này (vd từng chiếc áo dài khác nhau mỗi cảnh),
      // tuyệt đối không được để continuity tự động ghi đè.
      const sceneOwnImage = scene.sourceImageBase64 && scene.sourceImageMimeType
        ? { base64: scene.sourceImageBase64, mimeType: scene.sourceImageMimeType }
        : undefined;

      // Scene Continuity — chỉ trích khung hình cuối cảnh trước khi cảnh này KHÔNG có ảnh
      // nguồn riêng (continuity dành cho luồng kịch bản/text thuần, không áp dụng khi user
      // đã chỉ định ảnh cụ thể cho từng cảnh). Thất bại (video mất sau F5, CORS taint...)
      // → undefined, fallback tạo cảnh thường.
      const continuityFrame = !sceneOwnImage && veoInput.sceneContinuity && previousSceneVideoUrl
        ? await extractLastFrameBase64(previousSceneVideoUrl)
        : undefined;

      const startImage = sceneOwnImage ?? continuityFrame;

      const basePrompt = buildScenePrompt(scene.prompt, veoInput.masterCharacterText);
      const prompt = continuityFrame ? `${basePrompt}\n\n[${CONTINUITY_FRAME_NOTE}]` : basePrompt;

      const referenceImage = veoInput.referenceImage?.url || (veoInput.referenceImage?.base64 && veoInput.referenceImage?.mimeType)
        ? veoInput.referenceImage
        : undefined;
      const characterImage = veoInput.characters?.find((c) => c.imageUrl || (c.imageBase64 && c.imageMimeType));
      console.log('[veo/generate] Master Cast / continuity check:', {
        sceneId: scene.id,
        hasSceneSourceImage: Boolean(scene.sourceImageBase64),
        hasReferenceImage: Boolean(referenceImage),
        hasCharacterImage: Boolean(characterImage?.imageBase64),
        sceneContinuityEnabled: Boolean(veoInput.sceneContinuity),
        usedContinuityFrame: Boolean(continuityFrame),
        characterNames: veoInput.characters?.map((c) => c.name) ?? [],
      });

      const started = await withVeoConcurrency(() =>
        veoService.startGeneration({
          apiKey,
          prompt,
          veoInput,
          durationSeconds: scene.durationSeconds,
          image: startImage,
        }),
      );
      operationName = started.operationName;
      callbacks?.onOperationStarted?.(operationName);
    }

    // Không bọc try/catch riêng — pollUntilDone/downloadVideo throw gì thì để nguyên
    // vậy propagate lên caller (scene-generation-queue.ts tự phân loại fatal/stop/retry).
    const videoUri = await pollUntilDone(apiKey, operationName, scene.id, veoInput.videoQuality, veoInput.provider);
    const blob = await veoService.downloadVideo({ apiKey, videoUri, provider: veoInput.provider });
    const videoUrl = URL.createObjectURL(blob);
    // Thành công → xoá veoOperationName (không còn cần resume-poll cảnh này). Cảnh sau
    // nối tiếp bằng KHUNG HÌNH CUỐI của videoUrl này, không cần taskId nữa.
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
