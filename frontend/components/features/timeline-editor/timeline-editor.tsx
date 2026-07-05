'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play, Pause, SkipBack, ZoomIn, ZoomOut, Volume2, Download,
  Music, Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Loader2, Film, Subtitles, Mic2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoScene } from '@/lib/scenes';
import type { PresetTimelineDemo } from '@/lib/preset-scripts';
import { formatSceneTimeRange } from '@/lib/scenes';
import { composeVideo, downloadBlob } from '@/lib/video-composer';

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
}

export function TimelineEditor({ scenes = [], focusBgmKey, timelineDefaults }: TimelineEditorProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmSectionRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const readyScenes = useMemo(
    () => scenes.filter((s) => s.status === 'success' || s.status === 'edited'),
    [scenes],
  );

  const totalDuration = useMemo(
    () => readyScenes.reduce((sum, s) => sum + s.durationSeconds, 0),
    [readyScenes],
  );

  const timelineMarks = useMemo(() => {
    if (totalDuration <= 0) return [0];
    const step = totalDuration <= 30 ? 3 : Math.ceil(totalDuration / 10);
    const marks: number[] = [];
    for (let t = 0; t <= totalDuration; t += step) marks.push(t);
    if (marks[marks.length - 1] !== totalDuration) marks.push(totalDuration);
    return marks;
  }, [totalDuration]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [zoom, setZoom] = useState(50);
  const [playhead, setPlayhead] = useState(0);

  const [showBgm, setShowBgm] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bgmVolume, setBgmVolume] = useState(30);
  const [bgmSaved, setBgmSaved] = useState(false);

  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderDone, setRenderDone] = useState(false);

  const hasBgm = selectedTrack !== null || uploadedFile !== null;
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
    if (!isPlaying || !previewRef.current || readyScenes.length === 0) return;
    const video = previewRef.current;
    video.play().catch(() => setIsPlaying(false));
  }, [isPlaying, readyScenes.length]);

  const activeSceneForPreview = useMemo(() => {
    if (readyScenes.length === 0) return null;
    return readyScenes.find((s) => playhead >= s.timeStart && playhead < s.timeEnd) ?? readyScenes[0];
  }, [readyScenes, playhead]);

  useEffect(() => {
    const src = activeSceneForPreview?.videoUrl;
    if (!previewRef.current || !src) return;
    if (previewRef.current.src !== src) previewRef.current.src = src;
  }, [activeSceneForPreview?.videoUrl]);

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
        onProgress: (pct, msg) => {
          setRenderProgress(pct);
          setRenderMessage(msg);
        },
      });

      downloadBlob(result.blob, result.filename);
      setRenderDone(true);
      setTimeout(() => setRenderDone(false), 4000);
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Render thất bại — thử lại.');
    } finally {
      setIsRendering(false);
    }
  }, [readyScenes, uploadedFile, bgmVolume, includeSubtitles]);

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
        {/* Preview + playback */}
        <div className="px-5 py-3 border-b border-border flex flex-col sm:flex-row gap-4 bg-background/40">
          <div className="relative w-full sm:w-48 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0">
            {activeSceneForPreview?.videoUrl ? (
              <video
                ref={previewRef}
                className="w-full h-full object-cover"
                muted
                playsInline
                onTimeUpdate={(e) => {
                  const scene = activeSceneForPreview;
                  if (!scene) return;
                  setPlayhead(scene.timeStart + e.currentTarget.currentTime);
                }}
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Film className="w-8 h-8 opacity-40" />
              </div>
            )}
            {activeSceneForPreview && (
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                Cảnh {activeSceneForPreview.index}
              </span>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setPlayhead(0); setIsPlaying(false); }}
                className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary"
                aria-label="Quay về đầu"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((v) => !v)}
                disabled={!activeSceneForPreview?.videoUrl}
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
                  onClick={() => setPlayhead(scene.timeStart)}
                  style={{ flex: `${scene.durationSeconds} 0 60px` }}
                  className={cn(
                    'h-9 min-w-[48px] rounded-lg flex items-center justify-center text-xs font-bold transition-colors',
                    playhead >= scene.timeStart && playhead < scene.timeEnd
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

          {/* Voice / TTS track */}
          <div className="flex border-b border-border min-w-[600px]">
            <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
              <span className="block text-xs font-semibold text-foreground">Voice (TTS)</span>
              <span className="block text-[10px] text-muted-foreground">Lồng tiếng</span>
            </div>
            <div className="flex-1 px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto min-h-[44px]">
              {readyScenes.map((scene) => (
                <div
                  key={scene.id}
                  style={{ flex: `${scene.durationSeconds} 0 60px` }}
                  className="h-9 min-w-[48px] bg-primary/10 border border-primary/20 rounded-lg px-2 flex items-center"
                  title={scene.voice}
                >
                  <span className="text-[10px] text-primary/80 truncate">{scene.voice.slice(0, 24)}…</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtitle track */}
          <div className="flex border-b border-border min-w-[600px]">
            <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
              <span className="block text-xs font-semibold text-foreground">Subtitle</span>
              <span className="block text-[10px] text-muted-foreground">{includeSubtitles ? 'Bật' : 'Tắt'}</span>
            </div>
            <div className="flex-1 px-3 py-2.5 flex items-center gap-1.5 overflow-x-auto min-h-[44px]">
              {includeSubtitles && readyScenes.map((scene) => (
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
            {uploadError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="w-3.5 h-3.5" />{uploadError}</p>
            )}

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
              <input type="checkbox" checked={includeSubtitles} onChange={(e) => setIncludeSubtitles(e.target.checked)} className="accent-primary" />
              <Subtitles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Phụ đề + lời thoại TTS</span>
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs text-muted-foreground">
              <Mic2 className="w-4 h-4" />
              Voice track từ mục 3 · {readyScenes.length} cảnh
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

          {renderError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />{renderError}
            </p>
          )}

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
