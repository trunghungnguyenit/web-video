/**
 * Capture 1 khung hình giữa clip làm thumbnail.
 * I2V (Grok + Master Cast) frame 0 ≈ ảnh Character Sheet — không dùng làm đại diện cảnh.
 */
export function captureSceneThumbnail(
  videoUrl: string,
  opts?: { atRatio?: number; maxAtSeconds?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let settled = false;

    const cleanup = () => {
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
    };

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error('Không capture được thumbnail'));
    };

    video.onerror = () => fail(new Error('Không tải được video để lấy thumbnail'));

    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const atRatio = opts?.atRatio ?? 0.4;
      const maxAt = opts?.maxAtSeconds ?? 2.5;
      const target =
        duration > 0.4
          ? Math.min(Math.max(duration * atRatio, 0.35), maxAt, Math.max(duration - 0.2, 0.1))
          : 0.1;
      try {
        video.currentTime = target;
      } catch (err) {
        fail(err);
      }
    };

    video.onseeked = () => {
      if (settled) return;
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          fail(new Error('Video chưa có kích thước khung hình'));
          return;
        }
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const scale = Math.min(1, maxW / w);
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fail(new Error('Canvas không hỗ trợ'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (!blob) {
              reject(new Error('Không tạo được ảnh thumbnail'));
              return;
            }
            resolve(URL.createObjectURL(blob));
          },
          'image/jpeg',
          0.82,
        );
      } catch (err) {
        fail(err);
      }
    };

    video.src = videoUrl;
  });
}
