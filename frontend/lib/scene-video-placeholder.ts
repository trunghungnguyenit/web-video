import type { VideoScene } from '@/lib/scenes';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = '';
  let cy = y;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

/** Tạo clip video placeholder (WebM) cho cảnh — mô phỏng output AI video */
export async function createScenePlaceholderVideo(
  scene: Pick<VideoScene, 'index' | 'prompt' | 'voice' | 'durationSeconds'>,
): Promise<string> {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas không khả dụng');

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const durationMs = Math.max(3000, scene.durationSeconds * 1000);
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(URL.createObjectURL(blob));
    };
    recorder.onerror = () => reject(new Error(`Không thể tạo video cảnh ${scene.index}`));

    recorder.start(200);

    const draw = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= durationMs) {
        recorder.stop();
        return;
      }

      const t = elapsed / durationMs;
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, `hsl(${240 + t * 20}, 45%, ${12 + t * 5}%)`);
      grad.addColorStop(1, `hsl(${260 + t * 15}, 50%, ${18 + t * 4}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 48, width - 96, height - 96);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText(`Cảnh ${scene.index}`, 72, 110);

      ctx.font = '22px system-ui, sans-serif';
      ctx.fillStyle = '#c7d2fe';
      wrapText(ctx, scene.prompt, 72, 160, width - 144, 30);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, height - 140, width, 140);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'italic 20px system-ui, sans-serif';
      wrapText(ctx, `"${scene.voice.slice(0, 100)}"`, 72, height - 110, width - 144, 26);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`${scene.durationSeconds}s · AI Video Studio`, 72, height - 36);

      requestAnimationFrame(draw);
    };

    draw();
  });
}

export function revokeSceneVideoUrl(url?: string) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

/** Gắn clip video placeholder cho các cảnh đã hoàn thành */
export async function attachVideosToScenes(scenes: VideoScene[]): Promise<VideoScene[]> {
  const results = await Promise.all(
    scenes.map(async (scene) => {
      if (scene.status !== 'success' && scene.status !== 'edited') return scene;
      revokeSceneVideoUrl(scene.videoUrl);
      try {
        const videoUrl = await createScenePlaceholderVideo(scene);
        return { ...scene, videoUrl, status: 'success' as const };
      } catch {
        return { ...scene, status: 'error' as const };
      }
    }),
  );
  return results;
}
