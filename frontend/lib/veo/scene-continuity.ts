// ─── Scene Continuity (Video Extension, Veo 3.1) — trợ giúp nối cảnh bằng video thật ──
// Google trả về 1 file GỘP (video cảnh trước + đoạn mới sinh) khi dùng instance.video —
// cắt lại chỉ giữ đoạn MỚI (đo độ dài thật, không giả định cố định) để mỗi cảnh vẫn là
// 1 clip riêng, đúng kiến trúc hiện tại.

import { parseDataUrl } from '@/lib/pipeline-payload';
import { getFFmpeg, fetchFile } from '@/lib/video-library/ffmpeg-client';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Không đọc được video.'));
    };
    reader.onerror = () => reject(new Error('Không đọc được video.'));
    reader.readAsDataURL(blob);
  });
}

/** Đọc độ dài THẬT của 1 video blob (giây) — qua thẻ <video> ẩn, không cần FFmpeg */
export function getVideoDurationSeconds(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Không đọc được độ dài video.'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => reject(new Error('Không đọc được độ dài video.'));
    video.src = URL.createObjectURL(blob);
  });
}

/**
 * Tải video từ URL (blob:/signed URL) → base64 thuần + mimeType + độ dài THẬT (giây), dùng
 * gửi Veo (instance.video) VÀ để tính đúng đoạn mới sau khi Veo trả file gộp (xem
 * trimNewSegment bên dưới) — không giả định cứng Google thêm đúng bao nhiêu giây mỗi lần.
 */
export async function fetchVideoAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string; durationSeconds: number } | undefined> {
  try {
    const blob = await (await fetch(url)).blob();
    const [dataUrl, durationSeconds] = await Promise.all([
      blobToDataUrl(blob),
      getVideoDurationSeconds(blob),
    ]);
    const parsed = parseDataUrl(dataUrl);
    return parsed ? { ...parsed, durationSeconds } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cắt giữ lại đúng `seconds` giây CUỐI của video — dùng sau khi Veo trả về file gộp
 * (video cảnh trước + đoạn mới) từ Video Extension, để lưu lại đúng 1 clip riêng cho
 * cảnh hiện tại (không lặp lại nội dung cảnh trước trong file lưu trữ).
 */
async function trimToLastSeconds(videoBlob: Blob, seconds: number): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const inName = 'continuity_in.mp4';
  const outName = 'continuity_out.mp4';

  await ffmpeg.writeFile(inName, await fetchFile(videoBlob));
  await ffmpeg.exec(['-sseof', `-${seconds}`, '-i', inName, '-c', 'copy', outName]);
  const data = await ffmpeg.readFile(outName);

  await ffmpeg.deleteFile(inName);
  await ffmpeg.deleteFile(outName);

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'video/mp4' });
}

/**
 * Cắt bỏ đoạn cảnh TRƯỚC khỏi video gộp Veo trả về — đo độ dài THẬT của video gộp trừ đi
 * độ dài THẬT của video cảnh trước đã gửi lên, ra đúng độ dài đoạn MỚI cần giữ lại. Tránh
 * giả định cứng số giây Google thêm mỗi lần (khác nhau tuỳ model/lần gọi), nguyên nhân
 * khiến video lưu lại vẫn dính đoạn đuôi của cảnh trước.
 */
export async function trimNewSegment(
  mergedBlob: Blob,
  previousDurationSeconds: number,
): Promise<Blob> {
  const mergedDuration = await getVideoDurationSeconds(mergedBlob);
  // Trừ hao 0.15s để chắc chắn không sót lại frame cuối của cảnh trước do sai số làm tròn
  // / cắt không đúng keyframe (stream copy chỉ cắt được tại keyframe gần nhất).
  const newSegmentSeconds = Math.max(1, mergedDuration - previousDurationSeconds - 0.15);
  return trimToLastSeconds(mergedBlob, newSegmentSeconds);
}
