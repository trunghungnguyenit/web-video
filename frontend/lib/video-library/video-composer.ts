// ─── Ghép cảnh + BGM + phụ đề → xuất MP4 (FFmpeg.wasm client-side) ──────────

import type { VideoScene } from '@/lib/scene/scenes';
import { recalculateSceneTimings } from '@/lib/scene/scenes';
import { buildSrtFromScenes } from '@/lib/scene/subtitle-utils';
import { createScenePlaceholderVideo } from '@/lib/scene/scene-video-placeholder';
import { fetchFile, getFFmpeg } from '@/lib/video-library/ffmpeg-client';

export interface VideoRenderOptions {
  scenes: VideoScene[];
  bgmFile?: File | null;
  bgmVolume?: number;
  includeSubtitles?: boolean;
  onProgress?: (percent: number, message: string) => void;
}

export interface VideoRenderResult {
  blob: Blob;
  filename: string;
  durationSeconds: number;
}

/** Lọc cảnh success/edited và tính lại timing trước khi render */
function readyScenes(scenes: VideoScene[]): VideoScene[] {
  return recalculateSceneTimings(
    scenes.filter((s) => s.status === 'success' || s.status === 'edited'),
  );
}

/** Chuẩn hóa clip cảnh → MP4 H.264 qua FFmpeg (placeholder nếu thiếu videoUrl) */
async function ensureSceneClip(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  scene: VideoScene,
  index: number,
): Promise<string> {
  const outName = `clip_${index}.mp4`;
  const inName = `input_${index}.webm`;

  let sourceUrl = scene.videoUrl;
  if (!sourceUrl) {
    sourceUrl = await createScenePlaceholderVideo(scene);
  }

  await ffmpeg.writeFile(inName, await fetchFile(sourceUrl));

  // Loop nếu clip nguồn ngắn hơn durationSeconds — giữ đủ độ dài từng cảnh
  await ffmpeg.exec([
    '-stream_loop', '-1',
    '-i', inName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-s', '1280x720',
    '-r', '30',
    '-t', String(scene.durationSeconds),
    '-an',
    outName,
  ]);

  await ffmpeg.deleteFile(inName);
  return outName;
}

/** Ghép TTS từng cảnh theo thứ tự timeline → một track AAC */
async function buildVoiceTrack(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  timeline: VideoScene[],
): Promise<string | null> {
  const hasVoice = timeline.some((s) => s.audioUrl);
  if (!hasVoice) return null;

  const segmentNames: string[] = [];

  for (let i = 0; i < timeline.length; i++) {
    const scene = timeline[i];
    const outName = `voice_${i}.aac`;

    if (scene.audioUrl) {
      const inName = `voice_in_${i}.mp3`;
      await ffmpeg.writeFile(inName, await fetchFile(scene.audioUrl));
      // Pad TTS đủ durationSeconds — tránh audio ngắn hơn video → lệch timeline
      await ffmpeg.exec([
        '-i', inName,
        '-af', `apad=whole_dur=${scene.durationSeconds}`,
        '-t', String(scene.durationSeconds),
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
        outName,
      ]);
      await ffmpeg.deleteFile(inName);
    } else {
      await ffmpeg.exec([
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-t', String(scene.durationSeconds),
        '-c:a', 'aac', '-b:a', '128k',
        outName,
      ]);
    }

    segmentNames.push(outName);
  }

  const listContent = segmentNames.map((n) => `file '${n}'`).join('\n');
  await ffmpeg.writeFile('voice_concat.txt', listContent);
  await ffmpeg.exec([
    '-f', 'concat', '-safe', '0', '-i', 'voice_concat.txt',
    '-c:a', 'aac', '-b:a', '128k',
    'voice_track.aac',
  ]);

  for (const name of segmentNames) await ffmpeg.deleteFile(name);
  await ffmpeg.deleteFile('voice_concat.txt');

  return 'voice_track.aac';
}

/** Ghép các cảnh + BGM + phụ đề SRT → xuất blob MP4 client-side */
export async function composeVideo(options: VideoRenderOptions): Promise<VideoRenderResult> {
  const {
    scenes,
    bgmFile,
    bgmVolume = 30,
    includeSubtitles = true,
    onProgress,
  } = options;

  const timeline = readyScenes(scenes);
  if (timeline.length === 0) {
    throw new Error('Không có cảnh video hoàn thiện để render. Hãy tạo cảnh ở mục 3 trước.');
  }

  const totalDuration = timeline.reduce((sum, s) => sum + s.durationSeconds, 0);
  onProgress?.(2, 'Đang tải FFmpeg...');

  const ffmpeg = await getFFmpeg((msg) => {
    if (msg.includes('frame=')) onProgress?.(50, 'Đang xử lý khung hình...');
  });

  onProgress?.(8, `Chuẩn hóa ${timeline.length} cảnh video...`);

  const clipNames: string[] = [];
  for (let i = 0; i < timeline.length; i++) {
    onProgress?.(8 + Math.round((i / timeline.length) * 35), `Xử lý cảnh ${i + 1}/${timeline.length}...`);
    clipNames.push(await ensureSceneClip(ffmpeg, timeline[i], i));
  }

  const listContent = clipNames.map((n) => `file '${n}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', listContent);

  onProgress?.(48, 'Ghép các cảnh video...');
  await ffmpeg.exec([
    '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    'combined.mp4',
  ]);

  for (const name of clipNames) await ffmpeg.deleteFile(name);
  await ffmpeg.deleteFile('concat.txt');

  let currentVideo = 'combined.mp4';

  if (includeSubtitles) {
    onProgress?.(58, 'Thêm phụ đề & lời thoại TTS...');
    const srt = buildSrtFromScenes(timeline);
    await ffmpeg.writeFile('subs.srt', srt);

    try {
      await ffmpeg.exec([
        '-i', currentVideo,
        '-vf', "subtitles=subs.srt:force_style='FontName=Arial,FontSize=22,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=3,Alignment=2,MarginV=40'",
        '-c:v', 'libx264', '-preset', 'ultrafast',
        'with_subs.mp4',
      ]);
      await ffmpeg.deleteFile('subs.srt');
      if (currentVideo !== 'combined.mp4') await ffmpeg.deleteFile(currentVideo);
      currentVideo = 'with_subs.mp4';
    } catch {
      await ffmpeg.deleteFile('subs.srt');
      onProgress?.(62, 'Phụ đề embed — dùng lời thoại trong clip video');
    }
  }

  onProgress?.(72, 'Tạo track lời thoại TTS...');
  const voiceTrack = await buildVoiceTrack(ffmpeg, timeline);

  if (!voiceTrack) {
    onProgress?.(74, 'Không có TTS — tạo track im lặng...');
    await ffmpeg.exec([
      '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100`,
      '-t', String(totalDuration),
      '-c:a', 'aac', '-b:a', '128k',
      'silent.aac',
    ]);
  }

  const audioTrack = voiceTrack ?? 'silent.aac';

  onProgress?.(78, 'Ghép âm thanh vào video...');
  await ffmpeg.exec([
    '-i', currentVideo,
    '-i', audioTrack,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-t', String(totalDuration),
    'video_with_audio.mp4',
  ]);

  if (!voiceTrack) await ffmpeg.deleteFile('silent.aac');
  else await ffmpeg.deleteFile(voiceTrack);
  if (currentVideo !== 'combined.mp4') await ffmpeg.deleteFile(currentVideo);
  currentVideo = 'video_with_audio.mp4';

  if (bgmFile) {
    onProgress?.(85, 'Trộn nhạc nền (BGM)...');
    const bgmName = 'bgm_input' + (bgmFile.name.match(/\.(\w+)$/)?.[0] ?? '.mp3');
    await ffmpeg.writeFile(bgmName, await fetchFile(bgmFile));

    const vol = Math.max(0, Math.min(100, bgmVolume)) / 100;

    await ffmpeg.exec([
      '-i', currentVideo,
      '-i', bgmName,
      '-filter_complex',
      `[1:a]volume=${vol},apad=whole_dur=${totalDuration}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      '-map', '0:v', '-map', '[aout]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      'final.mp4',
    ]);

    await ffmpeg.deleteFile(bgmName);
    await ffmpeg.deleteFile(currentVideo);
    currentVideo = 'final.mp4';
  } else {
    await ffmpeg.exec(['-i', currentVideo, '-c', 'copy', 'final.mp4']);
    await ffmpeg.deleteFile(currentVideo);
    currentVideo = 'final.mp4';
  }

  onProgress?.(95, 'Xuất file video...');
  const data = await ffmpeg.readFile(currentVideo);
  await ffmpeg.deleteFile(currentVideo);

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'video/mp4' });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  onProgress?.(100, 'Hoàn tất!');

  return {
    blob,
    filename: `ai-video-studio-${timestamp}.mp4`,
    durationSeconds: totalDuration,
  };
}

/** Tải blob xuống máy qua thẻ `<a download>` tạm */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
