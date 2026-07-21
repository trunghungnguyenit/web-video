// ─── Trích khung hình CUỐI của 1 video → base64 (Scene Continuity) ──────────
// Dùng làm khung đầu (first frame) cho cảnh kế tiếp qua /veo/generate mode
// FIRST_AND_LAST_FRAMES_2_VIDEO — neo lại nhân vật/bối cảnh bằng pixel thật.

/**
 * Trích khung hình cuối video thành base64 (không kèm prefix data URL).
 * Trả `undefined` nếu thất bại (video lỗi, hoặc canvas bị "taint" do CORS khi
 * video là signed URL cross-origin) — caller tự fallback tạo cảnh không có khung nối.
 *
 * Blob URL cùng phiên (blob:) không bao giờ taint canvas → luôn trích được. Rủi ro
 * taint chỉ xảy ra khi resume: video cảnh trước là signed URL Storage cross-origin.
 */
export function extractLastFrameBase64(
  videoUrl: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';

    let settled = false;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };
    const done = (result: { base64: string; mimeType: string } | undefined) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    video.onloadedmetadata = () => {
      // Seek gần cuối (không seek đúng duration — vài trình duyệt không render frame ở mốc cuối)
      const target = Number.isFinite(video.duration) && video.duration > 0
        ? Math.max(0, video.duration - 0.05)
        : 0;
      video.currentTime = target;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
          done(undefined);
          return;
        }
        ctx.drawImage(video, 0, 0);
        // toDataURL throw nếu canvas bị taint (video cross-origin không có CORS header)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
        done(match ? { mimeType: match[1], base64: match[2] } : undefined);
      } catch {
        done(undefined);
      }
    };

    video.onerror = () => done(undefined);

    video.src = videoUrl;
  });
}
