// ─── Đọc thời lượng THẬT của 1 video blob/URL — dùng chung cho queue tạo cảnh + export ──

/** Đọc metadata video → độ dài giây thật (Veo/Kie có thể trả về lệch vài phần giây so với
 * con số đã "xin" lúc generate — không tin tưởng mù quáng giá trị dự kiến ban đầu). */
export function getVideoDurationSeconds(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      const duration = video.duration;
      video.removeAttribute('src');
      video.load();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Không đọc được độ dài video'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => reject(new Error('Không load được metadata video'));
    video.src = url;
  });
}
