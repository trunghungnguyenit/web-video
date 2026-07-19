'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play, Pause, SkipBack, ZoomIn, ZoomOut, Volume2, Download,
  Music, Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Loader2, Film, Subtitles, Mic2, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/ui/field-error';
import type { VideoScene } from '@/lib/scene/scenes';
import type { PresetTimelineDemo } from '@/lib/preset/preset-scripts';
import { formatSceneTimeRange, findSceneAtPlayhead, scenesTimingSignature } from '@/lib/scene/scenes';
import {
  SCENE_TRANSITION_OPTIONS,
  crossfadeAudio,
  crossfadeVideo,
  transitionMs,
} from '@/lib/scene/scene-transition';
import { composeVideo, downloadBlob } from '@/lib/video-library/video-composer';
import { toUserMessage } from '@/lib/error-messages';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { insertRenderHistory } from '@/lib/render-history/render-history-remote';

const PRESET_TRACKS = [
  { id: 1, name: 'Ambient Calm',     duration: '3:24', mood: 'Thư giãn' },
  { id: 2, name: 'Upbeat Corporate', duration: '2:45', mood: 'Chuyên nghiệp' },
  { id: 3, name: 'Cinematic Epic',   duration: '4:10', mood: 'Hoành tráng' },
  { id: 4, name: 'Lo-fi Chill',      duration: '3:00', mood: 'Bình thản' },
];

const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a', 'audio/m4a'];
const ACCEPTED_EXT   = /\.(mp3|wav|ogg|m4a)$/i;
const MAX_AUDIO_MB   = 20;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface TimelineEditorProps {
  scenes?: VideoScene[];
  focusBgmKey?: number;
  timelineDefaults?: PresetTimelineDemo | null;
  /** Sau khi sửa cảnh ở mục 3 — timeline seek về đúng cảnh đó */
  focusSceneId?: string | null;
  onFocusSceneHandled?: () => void;
}

export function TimelineEditor({
  scenes = [],
  focusBgmKey,
  timelineDefaults,
  focusSceneId,
  onFocusSceneHandled,
}: TimelineEditorProps = {}) {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmSectionRef = useRef<HTMLDivElement>(null);
  const previewARef = useRef<HTMLVideoElement>(null);
  const previewBRef = useRef<HTMLVideoElement>(null);
  const frontVideoIsA = useRef(true);
  const ttsAudioRef = useRef<HTMLAudioElement>(null);
  const ttsAudioBRef = useRef<HTMLAudioElement>(null);
  const activeTtsIsMain = useRef(true);
  const isTransitioningRef = useRef(false);
  const ttsSceneIdRef = useRef<string | null>(null);
  const playheadRef = useRef(0);
  const prevScenesRef = useRef<VideoScene[]>([]);
  const playRafRef = useRef<number | null>(null);
  const playLastTickRef = useRef(0);

  /** Bật = nghe tiếng video + lời dẫn TTS; Tắt = chỉ tiếng trong video */
  const [playNarration, setPlayNarration] = useState(true);

  const readyScenes = useMemo(
    () => scenes.filter((s) =>
      s.status === 'success' || s.status === 'edited' || s.status === 'generating',
    ),
    [scenes],
  );

  const totalDuration = useMemo(() => {
    if (readyScenes.length === 0) return 0;
    return readyScenes[readyScenes.length - 1].timeEnd;
  }, [readyScenes]);

  const timelineMarks = useMemo(() => {
    if (totalDuration <= 0) return [0];
    const step = totalDuration <= 30 ? 3 : Math.ceil(totalDuration / 10);
    const marks: number[] = [];
    for (let t = 0; t <= totalDuration; t += step) marks.push(t);
    if (marks[marks.length - 1] !== totalDuration) marks.push(totalDuration);
    return marks;
  }, [totalDuration]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSceneId, setPlaybackSceneId] = useState<string | null>(null);
  const [volume, setVolume] = useState(80);
  const [zoom, setZoom] = useState(50);
  const [playhead, setPlayhead] = useState(0);
  playheadRef.current = playhead;

  const [showBgm, setShowBgm] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bgmVolume, setBgmVolume] = useState(30);
  const [bgmSaved, setBgmSaved] = useState(false);

  const [transitionSec, setTransitionSec] = useState(0.6);
  const [frontIsA, setFrontIsA] = useState(true);
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderDone, setRenderDone] = useState(false);

  const hasBgm = selectedTrack !== null || uploadedFile !== null;
  const ttsReadyCount = readyScenes.filter((s) => s.audioUrl).length;
  const progressPct = totalDuration > 0 ? (playhead / totalDuration) * 100 : 0;

  useEffect(() => {
    if (!focusBgmKey) return;
    setShowBgm(true);
    setTimeout(() => bgmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [focusBgmKey]);

  useEffect(() => {
    if (!timelineDefaults) return;
    setIncludeSubtitles(timelineDefaults.includeSubtitles);
    setBgmVolume(timelineDefaults.bgmVolume);
    const track = PRESET_TRACKS.find((t) => t.name === timelineDefaults.bgmPresetName);
    if (track) {
      setSelectedTrack(track.id);
      setUploadedFile(null);
    }
    setShowBgm(true);
  }, [timelineDefaults]);

  useEffect(() => {
    const vol = volume / 100;
    const main = ttsAudioRef.current;
    const alt = ttsAudioBRef.current;
    if (main && activeTtsIsMain.current) main.volume = vol;
    if (alt && !activeTtsIsMain.current) alt.volume = vol;
    const va = previewARef.current;
    const vb = previewBRef.current;
    // Luôn mở tiếng video (SFX / lời trong clip). Lời dẫn TTS bật/tắt riêng.
    if (va) {
      va.muted = false;
      va.volume = vol;
    }
    if (vb) {
      vb.muted = false;
      vb.volume = vol;
    }
    if (!playNarration) {
      main?.pause();
      alt?.pause();
    }
  }, [volume, playNarration]);

  const applySceneMedia = useCallback(async (
    scene: VideoScene,
    opts: { animate: boolean; offset?: number; playing: boolean },
  ) => {
    const ms = opts.animate && transitionSec > 0 ? transitionMs(transitionSec) : 0;
    if (isTransitioningRef.current && ms > 0) return;

    isTransitioningRef.current = ms > 0;

    try {
      const vol = volume / 100;
      const offset = opts.offset ?? 0;

      const incomingVideo = frontVideoIsA.current ? previewBRef.current : previewARef.current;
      const outgoingVideo = frontVideoIsA.current ? previewARef.current : previewBRef.current;
      const incomingAudio = activeTtsIsMain.current ? ttsAudioBRef.current : ttsAudioRef.current;
      const outgoingAudio = activeTtsIsMain.current ? ttsAudioRef.current : ttsAudioBRef.current;

      const tasks: Promise<void>[] = [];

      if (scene.videoUrl && incomingVideo) {
        tasks.push(crossfadeVideo(outgoingVideo, incomingVideo, scene.videoUrl, ms, opts.playing, offset));
      }

      if (playNarration && scene.audioUrl && incomingAudio) {
        tasks.push(
          crossfadeAudio(
            opts.animate && ms > 0 ? outgoingAudio : null,
            incomingAudio,
            scene.audioUrl,
            vol,
            ms,
            offset,
          ),
        );
      } else {
        outgoingAudio?.pause();
        incomingAudio?.pause();
      }

      await Promise.all(tasks);

      if (scene.videoUrl && incomingVideo) {
        frontVideoIsA.current = !frontVideoIsA.current;
        setFrontIsA(frontVideoIsA.current);
      }

      if (playNarration && scene.audioUrl && incomingAudio) {
        activeTtsIsMain.current = !activeTtsIsMain.current;
      }

      ttsSceneIdRef.current = scene.id;
      setPlaybackSceneId(scene.id);

      if (!opts.playing) {
        incomingVideo?.pause();
        incomingAudio?.pause();
      }
    } finally {
      isTransitioningRef.current = false;

      // Playhead có thể đã sang cảnh khác trong lúc crossfade — bắt kịp ngay
      if (opts.playing) {
        const at = findSceneAtPlayhead(readyScenes, playheadRef.current);
        if (at && at.id !== scene.id) {
          const catchOffset = Math.max(0, playheadRef.current - at.timeStart);
          void applySceneMedia(at, {
            animate: transitionSec > 0,
            offset: catchOffset,
            playing: true,
          });
        }
      }
    }
  }, [transitionSec, volume, readyScenes, playNarration]);

  const activeSceneForPreview = useMemo(
    () => findSceneAtPlayhead(readyScenes, playhead),
    [readyScenes, playhead],
  );

  const stopPlaybackClock = useCallback(() => {
    if (playRafRef.current != null) {
      cancelAnimationFrame(playRafRef.current);
      playRafRef.current = null;
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlaybackClock();
      setPlaybackSceneId(null);
      setIsPlaying(false);
      previewARef.current?.pause();
      previewBRef.current?.pause();
      ttsAudioRef.current?.pause();
      ttsAudioBRef.current?.pause();
      return;
    }
    const scene = findSceneAtPlayhead(readyScenes, playhead) ?? readyScenes[0];
    if (!scene?.videoUrl && !scene?.audioUrl) return;
    const offset = Math.max(0, playhead - scene.timeStart);
    setIsPlaying(true);
    void applySceneMedia(scene, { animate: false, offset, playing: true });
  }, [isPlaying, readyScenes, playhead, applySceneMedia, stopPlaybackClock]);

  const isSceneActive = useCallback((scene: VideoScene) => {
    return playhead >= scene.timeStart && playhead < scene.timeEnd;
  }, [playhead]);

  // Đồng hồ playhead — luôn chạy theo durationSeconds từng cảnh, không theo TTS onEnded
  useEffect(() => {
    if (!isPlaying) {
      stopPlaybackClock();
      return;
    }

    playLastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = (now - playLastTickRef.current) / 1000;
      playLastTickRef.current = now;

      setPlayhead((p) => {
        const next = p + dt;
        if (next >= totalDuration) {
          stopPlaybackClock();
          setIsPlaying(false);
          setPlaybackSceneId(null);
          return totalDuration;
        }
        return next;
      });

      playRafRef.current = requestAnimationFrame(tick);
    };

    playRafRef.current = requestAnimationFrame(tick);
    return stopPlaybackClock;
  }, [isPlaying, totalDuration, stopPlaybackClock]);

  // Đổi cảnh preview khi playhead sang cảnh mới
  useEffect(() => {
    if (!isPlaying || isTransitioningRef.current) return;

    const scene = findSceneAtPlayhead(readyScenes, playhead);
    if (!scene) return;
    if (scene.id === playbackSceneId) return;

    const offset = Math.max(0, playhead - scene.timeStart);
    void applySceneMedia(scene, {
      animate: transitionSec > 0,
      offset,
      playing: true,
    });
  }, [playhead, isPlaying, readyScenes, playbackSceneId, applySceneMedia, transitionSec]);

  // Giữ playhead đúng cảnh khi timing thay đổi (sửa TTS → duration đổi)
  useEffect(() => {
    const prev = prevScenesRef.current;
    const curr = readyScenes;

    if (prev.length === 0) {
      prevScenesRef.current = curr;
      return;
    }

    if (scenesTimingSignature(prev) === scenesTimingSignature(curr)) return;

    setIsPlaying(false);
    stopPlaybackClock();
    ttsAudioRef.current?.pause();
    ttsAudioBRef.current?.pause();
    setPlaybackSceneId(null);

    const t = playheadRef.current;
    const oldScene = findSceneAtPlayhead(prev, t);
    if (oldScene) {
      const offset = t - oldScene.timeStart;
      const newScene = curr.find((s) => s.id === oldScene.id);
      if (newScene) {
        const clamped = Math.min(
          Math.max(0, offset),
          Math.max(0, newScene.durationSeconds - 0.05),
        );
        setPlayhead(newScene.timeStart + clamped);
        prevScenesRef.current = curr;
        return;
      }
    }

    setPlayhead((p) => Math.min(p, totalDuration));
    prevScenesRef.current = curr;
  }, [readyScenes, totalDuration]);

  // Seek timeline về cảnh vừa sửa ở mục 3
  useEffect(() => {
    if (!focusSceneId) return;
    const scene = readyScenes.find((s) => s.id === focusSceneId);
    if (!scene) return;

    setIsPlaying(false);
    stopPlaybackClock();
    ttsAudioRef.current?.pause();
    ttsAudioBRef.current?.pause();
    setPlaybackSceneId(null);
    ttsSceneIdRef.current = null;
    setPlayhead(scene.timeStart);
    onFocusSceneHandled?.();
  }, [focusSceneId, readyScenes, onFocusSceneHandled]);

  // Seek preview khi dừng — cắt nhanh, không flip layer nếu cùng cảnh
  useEffect(() => {
    if (isPlaying || isTransitioningRef.current) return;
    const scene = findSceneAtPlayhead(readyScenes, playhead);
    if (!scene) return;
    const offset = Math.max(0, playhead - scene.timeStart);

    if (ttsSceneIdRef.current === scene.id) {
      const audio = activeTtsIsMain.current ? ttsAudioRef.current : ttsAudioBRef.current;
      if (audio && scene.audioUrl) audio.currentTime = offset;
      return;
    }

    void applySceneMedia(scene, { animate: false, offset, playing: false });
  }, [playhead, isPlaying, readyScenes, applySceneMedia]);

  const handlePreviewVideoLoop = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const frontVideo = frontVideoIsA.current ? previewARef.current : previewBRef.current;
    if (e.currentTarget !== frontVideo || !isPlaying) return;

    // Video Veo ngắn hơn cảnh — loop cho đến khi playhead sang cảnh tiếp theo
    e.currentTarget.currentTime = 0;
    void e.currentTarget.play();
  }, [isPlaying]);

  const validateAndSetAudio = (file: File) => {
    setUploadError(null);
    const okMime = ACCEPTED_AUDIO.includes(file.type);
    const okExt  = ACCEPTED_EXT.test(file.name);
    if (!okMime && !okExt) {
      setUploadError(`File "${file.name}" không phải audio hợp lệ. Chấp nhận: MP3, WAV, M4A, OGG.`);
      return;
    }
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_AUDIO_MB) {
      setUploadError(`File quá lớn (${sizeMB.toFixed(1)} MB) — tối đa ${MAX_AUDIO_MB} MB.`);
      return;
    }
    setUploadedFile(file);
    setSelectedTrack(null);
  };

  const handleBgmSave = () => {
    if (!hasBgm) return;
    setBgmSaved(true);
    setTimeout(() => setBgmSaved(false), 2500);
  };

  const activeBgmLabel = uploadedFile
    ? uploadedFile.name
    : selectedTrack !== null
      ? PRESET_TRACKS.find((t) => t.id === selectedTrack)?.name ?? ''
      : 'Chưa chọn';

  const handleRender = useCallback(async () => {
    if (readyScenes.length === 0) {
      setRenderError('Chưa có cảnh video hoàn thiện. Hãy tạo cảnh ở mục 3 trước.');
      return;
    }

    setIsRendering(true);
    setRenderError(null);
    setRenderDone(false);
    setRenderProgress(0);
    setRenderMessage('Khởi tạo FFmpeg...');

    try {
      const result = await composeVideo({
        scenes: readyScenes,
        bgmFile: uploadedFile,
        bgmVolume,
        includeSubtitles,
        includeTts: playNarration,
        onProgress: (pct, msg) => {
          setRenderProgress(pct);
          setRenderMessage(msg);
        },
      });

      downloadBlob(result.blob, result.filename);
      setRenderDone(true);
      setTimeout(() => setRenderDone(false), 4000);

      const supabase = supabaseRef.current;
      if (user && supabase) {
        insertRenderHistory(supabase, user.id, {
          fileName: result.filename,
          fileSizeBytes: result.blob.size,
          durationSeconds: result.durationSeconds,
          status: 'completed',
        }).catch((err) => console.error('[render-history] Ghi lịch sử thất bại:', err));
      }
    } catch (err) {
      const message = toUserMessage(err, 'Render video thất bại — thử lại hoặc giảm số cảnh.');
      setRenderError(message);

      const supabase = supabaseRef.current;
      if (user && supabase) {
        insertRenderHistory(supabase, user.id, {
          fileName: `render-${Date.now()}.mp4`,
          status: 'failed',
          errorMessage: message,
        }).catch((e) => console.error('[render-history] Ghi lịch sử thất bại:', e));
      }
    } finally {
      setIsRendering(false);
    }
  }, [readyScenes, uploadedFile, bgmVolume, includeSubtitles, playNarration]);

  if (scenes.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          4. CHỈNH SỬA VIDEO
        </h2>
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
            <Film className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Timeline chưa sẵn sàng</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Hoàn thành mục 2 và mục 3 để có danh sách cảnh video. Sau đó dùng FFmpeg ghép cảnh,
              nhạc nền, phụ đề TTS và tải video hoàn chỉnh.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          4. CHỈNH SỬA VIDEO
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          FFmpeg · {readyScenes.length} cảnh · {formatDuration(totalDuration)} · Ghép nhạc · Phụ đề TTS · Tải MP4
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <audio ref={ttsAudioRef} className="hidden" />
        <audio ref={ttsAudioBRef} className="hidden" />

        {/* Preview + playback */}
        <div className="px-5 py-3 border-b border-border flex flex-col sm:flex-row gap-4 bg-background/40">
          <div className="relative w-full sm:w-48 aspect-video bg-black rounded-lg overflow-hidden shrink-0">
            {readyScenes.some((s) => s.videoUrl) ? (
              <>
                <video
                  ref={previewARef}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover',
                    frontIsA ? 'z-10' : 'z-0',
                  )}
                  muted={false}
                  playsInline
                  onEnded={handlePreviewVideoLoop}
                />
                <video
                  ref={previewBRef}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover',
                    frontIsA ? 'z-0' : 'z-10',
                  )}
                  muted={false}
                  playsInline
                  onEnded={handlePreviewVideoLoop}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Film className="w-8 h-8 opacity-40" />
              </div>
            )}
            {activeSceneForPreview && (
              <span className="absolute bottom-1 left-1 z-20 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                Cảnh {activeSceneForPreview.index}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  stopPlaybackClock();
                  setPlayhead(0);
                  setPlaybackSceneId(null);
                  setIsPlaying(false);
                }}
                className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary"
                aria-label="Quay về đầu"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!activeSceneForPreview?.videoUrl && !activeSceneForPreview?.audioUrl}
                className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary disabled:opacity-40"
                aria-label={isPlaying ? 'Dừng' : 'Phát'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <div className="text-xs font-mono text-foreground ml-2 tabular-nums">
                <span className="text-primary font-semibold">{formatDuration(playhead)}</span>
                <span className="text-muted-foreground"> / {formatDuration(totalDuration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button type="button" onClick={() => setZoom((v) => Math.max(10, v - 10))} className="p-1.5 hover:bg-muted rounded-lg">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input type="range" className="w-20 accent-primary" min="10" max="100" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              <button type="button" onClick={() => setZoom((v) => Math.min(100, v + 10))} className="p-1.5 hover:bg-muted rounded-lg">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline tracks */}
        <div className="overflow-x-auto">
          <div className="flex border-b border-border bg-background/50 sticky top-0 z-10 min-w-[600px]">
            <div className="w-28 flex-shrink-0 px-4 py-2 border-r border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Track</span>
            </div>
            <div className="flex-1 flex h-8">
              {timelineMarks.map((s) => (
                <div key={s} className="flex-1 text-center border-r border-border/30 flex items-end pb-1">
                  <span className="text-[10px] text-muted-foreground/60 w-full">{s}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Video track */}
          <div className="flex border-b border-border min-w-[600px]">
            <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
              <span className="block text-xs font-semibold text-foreground">Video</span>
              <span className="block text-[10px] text-muted-foreground">{readyScenes.length} clips</span>
            </div>
            <div className="flex-1 px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto min-h-[44px]">
              {readyScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => {
                    setPlayhead(scene.timeStart);
                    if (isPlaying) {
                      setPlaybackSceneId(scene.id);
                      void applySceneMedia(scene, {
                        animate: transitionSec > 0,
                        offset: 0,
                        playing: true,
                      });
                    }
                  }}
                  style={{ flex: `${scene.durationSeconds} 0 60px` }}
                  className={cn(
                    'h-9 min-w-[48px] rounded-lg flex items-center justify-center text-xs font-bold transition-colors',
                    isSceneActive(scene)
                      ? 'bg-primary/30 border border-primary text-primary'
                      : 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary/80',
                  )}
                  title={scene.prompt}
                >
                  #{scene.index}
                </button>
              ))}
            </div>
          </div>

          {/* Voice / TTS track — chỉ hiện khi bật Lời dẫn riêng */}
          {playNarration && (
            <div className="flex border-b border-border min-w-[600px]">
              <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
                <span className="block text-xs font-semibold text-foreground">Voice (TTS)</span>
                <span className="block text-[10px] text-muted-foreground">
                  {ttsReadyCount}/{readyScenes.length} có audio
                </span>
              </div>
              <div className="flex-1 px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto min-h-[44px]">
                {readyScenes.map((scene) => (
                  <div
                    key={scene.id}
                    style={{ flex: `${scene.durationSeconds} 0 60px` }}
                    className={cn(
                      'h-9 min-w-[48px] rounded-lg px-2 flex items-center gap-1',
                      scene.audioUrl
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-orange-500/10 border border-orange-500/20',
                    )}
                    title={scene.audioUrl ? scene.voice : `${scene.voice} (chưa có audio TTS)`}
                  >
                    {scene.audioUrl ? (
                      <Volume2 className="w-3 h-3 text-primary shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-orange-400 shrink-0" />
                    )}
                    <span className={cn(
                      'text-[10px] truncate',
                      scene.audioUrl ? 'text-primary/80' : 'text-orange-400/80',
                    )}>
                      {scene.voice.slice(0, 20)}…
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtitle track — chỉ hiện khi bật Phụ đề */}
          {includeSubtitles && (
            <div className="flex border-b border-border min-w-[600px]">
              <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
                <span className="block text-xs font-semibold text-foreground">Subtitle</span>
                <span className="block text-[10px] text-muted-foreground">Bật</span>
              </div>
              <div className="flex-1 px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto min-h-[44px]">
                {readyScenes.map((scene) => (
                  <div
                    key={scene.id}
                    style={{ flex: `${scene.durationSeconds} 0 60px` }}
                    className="h-9 min-w-[48px] bg-accent/10 border border-accent/20 rounded-lg px-2 flex items-center"
                  >
                    <span className="text-[10px] text-accent/80 truncate">Sub {scene.index}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BGM track */}
          <div ref={bgmSectionRef} className="flex border-b border-border min-w-[600px]">
            <button
              type="button"
              onClick={() => setShowBgm((v) => !v)}
              className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30 text-left hover:bg-muted/20"
            >
              <span className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Audio / BGM</span>
                {showBgm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
              <span className={cn('block text-[10px] mt-0.5 truncate', hasBgm ? 'text-primary' : 'text-muted-foreground')}>
                {activeBgmLabel}
              </span>
            </button>
            <div className="flex-1 px-3 py-2.5 flex items-center min-h-[44px]">
              {hasBgm ? (
                <div className="flex-1 h-9 bg-gradient-to-r from-green-500/15 to-green-500/25 rounded-lg flex items-center px-3 gap-2">
                  <Music className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[10px] text-green-400 truncate">{activeBgmLabel}</span>
                </div>
              ) : (
                <button type="button" onClick={() => setShowBgm(true)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Chọn nhạc nền...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BGM panel */}
        {showBgm && (
          <div className="border-t border-border bg-background/30 px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Nhạc nền (BGM) — FFmpeg amix</span>
              </div>
              <button type="button" onClick={() => setShowBgm(false)} className="text-xs text-muted-foreground hover:text-foreground">Thu gọn</button>
            </div>

            <input ref={fileInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetAudio(f); }} />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) validateAndSetAudio(f); }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer',
                uploadedFile ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{uploadedFile ? uploadedFile.name : 'Tải MP3 / WAV / OGG'}</p>
                <p className="text-xs text-muted-foreground">Tối đa {MAX_AUDIO_MB} MB</p>
              </div>
            </div>
            {uploadError && <FieldError className="items-center">{uploadError}</FieldError>}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Thư viện (demo — cần tải file để render)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {PRESET_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => { setSelectedTrack(selectedTrack === track.id ? null : track.id); setUploadedFile(null); }}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-left text-xs',
                      selectedTrack === track.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border',
                    )}
                  >
                    {track.name} · {track.mood}
                  </button>
                ))}
              </div>
              {selectedTrack && !uploadedFile && (
                <p className="text-[10px] text-orange-400">Preset chỉ mang tính tham khảo — tải file nhạc để ghép thật qua FFmpeg.</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <input type="range" min="0" max="100" value={bgmVolume} onChange={(e) => setBgmVolume(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-xs font-mono text-primary w-8">{bgmVolume}%</span>
            </div>

            <button type="button" onClick={handleBgmSave} disabled={!hasBgm || !uploadedFile}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 border border-primary/30 text-primary disabled:opacity-40">
              {bgmSaved ? <><CheckCircle2 className="w-4 h-4" />Đã chọn BGM</> : 'Áp dụng nhạc nền'}
            </button>
          </div>
        )}

        {/* Export options + render */}
        <div className="border-t border-border bg-background/40 px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/30">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium whitespace-nowrap">Chuyển cảnh</span>
              <select
                value={transitionSec}
                onChange={(e) => setTransitionSec(Number(e.target.value))}
                className="text-xs bg-background border border-border rounded-md px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {SCENE_TRANSITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/30">
              <input
                type="checkbox"
                checked={playNarration}
                onChange={(e) => setPlayNarration(e.target.checked)}
                className="accent-primary"
              />
              <Mic2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">
                Lời dẫn riêng
                <span className="block text-[10px] text-muted-foreground font-normal">
                  {playNarration
                    ? 'Bật — nghe tiếng video + lời dẫn TTS'
                    : 'Tắt — chỉ nghe tiếng trong video'}
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/30">
              <input type="checkbox" checked={includeSubtitles} onChange={(e) => setIncludeSubtitles(e.target.checked)} className="accent-primary" />
              <Subtitles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Phụ đề + lời thoại TTS</span>
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground">
              <Mic2 className="w-4 h-4" />
              {ttsReadyCount > 0
                ? `TTS preview · ${ttsReadyCount}/${readyScenes.length} cảnh`
                : 'Chưa có audio TTS — submit lại mục 2'}
            </div>
          </div>

          {isRendering && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  {renderMessage}
                </span>
                <span className="font-mono text-primary">{renderProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${renderProgress}%` }} />
              </div>
            </div>
          )}

          {renderError && <FieldError className="items-center">{renderError}</FieldError>}

          {renderDone && (
            <p className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" />Video đã render &amp; tải xuống thành công!
            </p>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono tabular-nums">
                <span className="text-primary font-bold">{formatDuration(playhead)}</span>
                <span className="text-muted-foreground"> / {formatDuration(totalDuration)}</span>
              </span>
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="range" className="w-16 accent-primary" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {readyScenes.length} clips · FFmpeg MP4
              </span>
              <button
                type="button"
                data-render="true"
                onClick={handleRender}
                disabled={isRendering || readyScenes.length === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-colors',
                  renderDone
                    ? 'bg-green-600 text-white'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50',
                )}
              >
                {isRendering ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />ĐANG RENDER...</>
                ) : renderDone ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" />ĐÃ TẢI XUỐNG</>
                ) : (
                  <><Download className="w-3.5 h-3.5" />RENDER &amp; TẢI VIDEO</>
                )}
              </button>
            </div>
          </div>

          {/* Scrubber */}
          <div
            className="relative h-4 flex items-center cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setPlayhead(Math.max(0, Math.min(totalDuration, pct * totalDuration)));
            }}
          >
            <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />
            <div className="absolute left-0 h-1 bg-primary rounded-full" style={{ width: `${progressPct}%` }} />
            <div className="absolute w-3 h-3 bg-primary rounded-full border-2 border-background -translate-x-1/2" style={{ left: `${progressPct}%` }} />
          </div>

          {/* Scene list summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50">
            {readyScenes.map((scene) => (
              <div key={scene.id} className="text-[10px] bg-muted/20 rounded-lg px-2.5 py-2 border border-border/50">
                <span className="font-bold text-primary">#{scene.index}</span>
                <span className="text-muted-foreground ml-1">{formatSceneTimeRange(scene)} · {scene.durationSeconds}s</span>
                <p className="text-foreground truncate mt-0.5">{scene.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
