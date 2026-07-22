// ─── Ghép cảnh + BGM → xuất MP4 (FFmpeg.wasm client-side) ──────────────────

import type { VideoScene } from '@/lib/scene/scenes';
import { recalculateSceneTimings } from '@/lib/scene/scenes';
import { createScenePlaceholderVideo } from '@/lib/scene/scene-video-placeholder';
import { getVideoDurationSeconds } from '@/lib/scene/scene-video-duration';
import { fetchFile, getFFmpeg } from '@/lib/video-library/ffmpeg-client';

export interface VideoRenderOptions {
  scenes: VideoScene[];
  bgmFile?: File | null;
  bgmVolume?: number;
  /** false = không trộn ElevenLabs TTS — chỉ giữ audio trong file video */
  includeTts?: boolean;
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

/**
 * Đo lại thời lượng THẬT của video từng cảnh — video Veo/Kie trả về không nhất thiết khớp
 * chính xác con số đã "xin" lúc generate. durationSeconds của cảnh có video thật giờ LUÔN
 * lấy đúng bằng độ dài thật này (không phải con số dự kiến ban đầu nữa) — vì ensureSceneClip
 * bên dưới không còn cắt/loop video thật nữa, nên mọi chỗ khác (audio track, phụ đề, tổng
 * thời lượng) phải tính theo đúng con số thật này để không bị lệch.
 */
async function withRealVideoDurations(scenes: VideoScene[]): Promise<VideoScene[]> {
  return Promise.all(
    scenes.map(async (s) => {
      if (!s.videoUrl) return s;
      try {
        const real = await getVideoDurationSeconds(s.videoUrl);
        return { ...s, durationSeconds: real };
      } catch {
        // Không đo được (blob lỗi, CORS...) — giữ nguyên durationSeconds đã có, không chặn render.
        return s;
      }
    }),
  );
}

/** Chuẩn hóa clip cảnh → MP4 H.264 qua FFmpeg (placeholder nếu thiếu videoUrl). Giữ audio native (Veo SFX) nếu có. */
async function ensureSceneClip(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  scene: VideoScene,
  index: number,
): Promise<string> {
  const outName = `clip_${index}.mp4`;
  const inName = `input_${index}.webm`;

  // Placeholder (chưa có video thật) là clip TỰ TẠO — cố ý khớp đúng durationSeconds. Video
  // THẬT thì giữ NGUYÊN VẸN toàn bộ độ dài gốc, không cắt không loop — chỉ chuẩn hoá định
  // dạng (codec/độ phân giải/fps) để ghép nối tin cậy được với các cảnh khác.
  const hasRealVideo = Boolean(scene.videoUrl);
  let sourceUrl = scene.videoUrl;
  if (!sourceUrl) {
    sourceUrl = await createScenePlaceholderVideo(scene);
  }

  await ffmpeg.writeFile(inName, await fetchFile(sourceUrl));

  const commonVideo = [
    ...(hasRealVideo ? [] : ['-stream_loop', '-1']),
    '-i', inName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-s', '1280x720',
    '-r', '30',
    ...(hasRealVideo ? [] : ['-t', String(scene.durationSeconds)]),
  ];

  // Ưu tiên giữ audio gốc (SFX Veo). Không có track audio → thêm silent.
  try {
    await ffmpeg.exec([
      ...commonVideo,
      '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
      outName,
    ]);
  } catch {
    await ffmpeg.exec([
      ...commonVideo,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:a', 'aac', '-b:a', '128k',
      '-shortest',
      outName,
    ]);
  }

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

/** Ghép các cảnh + BGM → xuất blob MP4 client-side */
export async function composeVideo(options: VideoRenderOptions): Promise<VideoRenderResult> {
  const {
    scenes,
    bgmFile,
    bgmVolume = 30,
    includeTts = true,
    onProgress,
  } = options;

  const filteredScenes = readyScenes(scenes);
  if (filteredScenes.length === 0) {
    throw new Error('Không có cảnh video hoàn thiện để render. Hãy tạo cảnh ở mục 3 trước.');
  }

  onProgress?.(1, 'Đang kiểm tra thời lượng thật của từng cảnh...');
  // Nâng durationSeconds đúng bằng độ dài THẬT nếu video dài hơn dự kiến — rồi tính lại
  // timeStart/timeEnd theo con số đã đúng này, để phụ đề/audio/tổng thời lượng khớp thật.
  const timeline = recalculateSceneTimings(await withRealVideoDurations(filteredScenes));

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

  onProgress?.(72, includeTts ? 'Tạo track lời thoại TTS...' : 'Bỏ qua TTS — dùng audio trong video...');
  const voiceTrack = includeTts ? await buildVoiceTrack(ffmpeg, timeline) : null;

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

  onProgress?.(78, 'Ghép âm thanh (SFX video + lời thoại TTS)...');
  // Trộn SFX/ambient trong file Veo (0:a) với TTS ElevenLabs (1:a). Không có TTS → giữ audio video.
  try {
    if (voiceTrack) {
      await ffmpeg.exec([
        '-i', currentVideo,
        '-i', audioTrack,
        '-filter_complex',
        '[0:a]volume=0.75[sfx];[1:a]volume=1.0[voice];[sfx][voice]amix=inputs=2:duration=first:dropout_transition=2[aout]',
        '-map', '0:v:0',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-t', String(totalDuration),
        'video_with_audio.mp4',
      ]);
    } else {
      await ffmpeg.exec([
        '-i', currentVideo,
        '-c', 'copy',
        '-t', String(totalDuration),
        'video_with_audio.mp4',
      ]);
    }
  } catch {
    // Video không có audio track — chỉ gắn TTS / silent như trước
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
  }

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
