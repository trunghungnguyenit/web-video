// ─── Scene Continuity (Video Extension, Veo 3.1) — trợ giúp nối cảnh bằng video thật ──
// Google trả về 1 file GỘP (video cảnh trước + đoạn mới sinh) khi dùng instance.video —
// cắt lại chỉ giữ đoạn MỚI (8s cuối) để mỗi cảnh vẫn là 1 clip riêng, đúng kiến trúc hiện tại.

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

/** Tải video từ URL (blob:/signed URL) → base64 thuần + mimeType, dùng gửi Veo (instance.video) */
export async function fetchVideoAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  try {
    const blob = await (await fetch(url)).blob();
    const dataUrl = await blobToDataUrl(blob);
    return parseDataUrl(dataUrl);
  } catch {
    return undefined;
  }
}

/**
 * Cắt giữ lại đúng `seconds` giây CUỐI của video — dùng sau khi Veo trả về file gộp
 * (video cảnh trước + đoạn mới) từ Video Extension, để lưu lại đúng 1 clip riêng cho
 * cảnh hiện tại (không lặp lại nội dung cảnh trước trong file lưu trữ).
 */
export async function trimToLastSeconds(videoBlob: Blob, seconds: number): Promise<Blob> {
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
