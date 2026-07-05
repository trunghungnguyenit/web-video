import type { VideoScene } from '@/lib/scenes';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, '0')}`;
}

/** Tạo file SRT từ lời thoại TTS các cảnh (phụ đề / lồng tiếng hiển thị) */
export function buildSrtFromScenes(scenes: VideoScene[]): string {
  return scenes
    .map((scene, i) => {
      const text = scene.voice.trim() || `Cảnh ${scene.index}`;
      return [
        String(i + 1),
        `${formatSrtTime(scene.timeStart)} --> ${formatSrtTime(scene.timeEnd)}`,
        text,
        '',
      ].join('\n');
    })
    .join('\n');
}
