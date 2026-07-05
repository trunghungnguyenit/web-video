'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, SkipBack, ZoomIn, ZoomOut, Volume2, Download,
  Music, Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Background Music config ──────────────────────────────────────────────────
const PRESET_TRACKS = [
  { id: 1, name: 'Ambient Calm',     duration: '3:24', mood: 'Thư giãn' },
  { id: 2, name: 'Upbeat Corporate', duration: '2:45', mood: 'Chuyên nghiệp' },
  { id: 3, name: 'Cinematic Epic',   duration: '4:10', mood: 'Hoành tráng' },
  { id: 4, name: 'Lo-fi Chill',      duration: '3:00', mood: 'Bình thản' },
];
const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/x-m4a', 'audio/m4a'];
const ACCEPTED_EXT   = /\.(mp3|wav|ogg|m4a)$/i;
const MAX_AUDIO_MB   = 20;

// ─── Timeline tracks ──────────────────────────────────────────────────────────
const TRACKS = [
  { id: 'video',      label: 'Video',      sub: '10 clips', clips: [1,2,3,4,5], type: 'video'      as const },
  { id: 'transition', label: 'Transition', sub: 'Fade In',  clips: [],           type: 'transition' as const },
  { id: 'voiceover',  label: 'Voiceover',  sub: 'TTS 1',    clips: [1,2,3,4,5], type: 'voice'      as const },
  { id: 'subtitle',   label: 'Subtitle',   sub: 'Auto',     clips: [1,2,3],     type: 'subtitle'   as const },
];

const TIMELINE_MARKS = Array.from({ length: 20 }, (_, i) => i * 3);

interface TimelineEditorProps {
  /** Sidebar click "Nhạc nền" → tăng key này → BGM panel expand + scroll */
  focusBgmKey?: number;
}

export function TimelineEditor({ focusBgmKey }: TimelineEditorProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmSectionRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume,    setVolume]    = useState(80);
  const [zoom,      setZoom]      = useState(50);
  const [progress]                = useState(24);

  // BGM state
  const [showBgm,        setShowBgm]        = useState(false);
  const [selectedTrack,  setSelectedTrack]  = useState<number | null>(null);
  const [uploadedFile,   setUploadedFile]   = useState<File | null>(null);
  const [uploadError,    setUploadError]    = useState<string | null>(null);
  const [bgmVolume,      setBgmVolume]      = useState(30);
  const [bgmSaved,       setBgmSaved]       = useState(false);

  const hasSelection = selectedTrack !== null || uploadedFile !== null;

  // Sidebar click "Nhạc nền" → mở panel + scroll
  useEffect(() => {
    if (!focusBgmKey) return;
    setShowBgm(true);
    setTimeout(() => bgmSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }, [focusBgmKey]);

  const validateAndSetAudio = (file: File) => {
    setUploadError(null);
    const okMime = ACCEPTED_AUDIO.includes(file.type);
    const okExt  = ACCEPTED_EXT.test(file.name);
    if (!okMime && !okExt) {
      const detected = file.type || 'không xác định';
      setUploadError(`File "${file.name}" không phải audio hợp lệ (định dạng phát hiện: ${detected}). Chấp nhận: MP3, WAV, M4A, OGG.`);
      return;
    }
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_AUDIO_MB) {
      setUploadError(`File "${file.name}" quá lớn (${sizeMB.toFixed(1)} MB) — tối đa ${MAX_AUDIO_MB} MB.`);
      return;
    }
    if (file.size === 0) {
      setUploadError(`File "${file.name}" trống (0 byte). Vui lòng chọn file khác.`);
      return;
    }
    setUploadedFile(file);
    setSelectedTrack(null);
  };

  const handleBgmSave = () => {
    if (!hasSelection) return;
    setBgmSaved(true);
    setTimeout(() => setBgmSaved(false), 2500);
  };

  const activeBgmLabel = uploadedFile
    ? uploadedFile.name
    : selectedTrack !== null
      ? PRESET_TRACKS.find((t) => t.id === selectedTrack)?.name ?? ''
      : 'Chưa chọn';

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
        4. TIMELINE — CHỈNH SỬA VIDEO
      </h2>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {/* Playback controls */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-background/40 gap-4">
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Quay về đầu"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary cursor-pointer">
              <SkipBack className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setIsPlaying((v) => !v)} aria-label={isPlaying ? 'Dừng' : 'Phát'}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary cursor-pointer">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="text-xs font-mono text-foreground ml-2 tabular-nums">
              <span className="text-primary font-semibold">00:14</span>
              <span className="text-muted-foreground"> / 00:59</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Thu nhỏ" onClick={() => setZoom((v) => Math.max(10, v - 10))}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input type="range" className="w-20 accent-primary cursor-pointer" min="10" max="100"
              value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom timeline" />
            <button type="button" aria-label="Phóng to" onClick={() => setZoom((v) => Math.min(100, v + 10))}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Track area */}
        <div className="overflow-x-auto">
          {/* Ruler */}
          <div className="flex border-b border-border bg-background/50 sticky top-0 z-10">
            <div className="w-28 flex-shrink-0 px-4 py-2 border-r border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Track</span>
            </div>
            <div className="flex-1 flex h-8">
              {TIMELINE_MARKS.map((s) => (
                <div key={s} className="flex-1 text-center border-r border-border/30 flex items-end pb-1">
                  <span className="text-[10px] text-muted-foreground/60 w-full">{s}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regular tracks */}
          {TRACKS.map((track) => (
            <div key={track.id} className="flex border-b border-border">
              <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
                <span className="block text-xs font-semibold text-foreground leading-none">{track.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">{track.sub}</span>
              </div>
              <div className="flex-1 px-3 py-2.5 flex items-center gap-2 overflow-x-auto min-h-[44px]">
                {track.type === 'video' && track.clips.map((i) => (
                  <div key={i} className="flex-shrink-0 w-20 h-9 bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/25 rounded-lg flex items-center justify-center text-xs font-bold text-primary/80 cursor-grab active:cursor-grabbing">#{i}</div>
                ))}
                {track.type === 'transition' && <span className="text-xs text-muted-foreground italic">Fade — tự động</span>}
                {track.type === 'voice' && track.clips.map((i) => (
                  <div key={i} className="flex-shrink-0 bg-primary/15 border border-primary/25 rounded-lg px-2.5 py-1 text-[11px] text-primary/80 font-medium whitespace-nowrap cursor-grab">Cảnh {i}...</div>
                ))}
                {track.type === 'subtitle' && track.clips.map((i) => (
                  <div key={i} className="flex-shrink-0 bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1 text-[11px] text-accent/70 font-medium whitespace-nowrap cursor-grab">Sub {i}</div>
                ))}
              </div>
            </div>
          ))}

          {/* BGM track — expandable */}
          <div ref={bgmSectionRef} className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setShowBgm((v) => !v)}
              aria-expanded={showBgm}
              aria-controls="bgm-panel"
              className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30 text-left hover:bg-muted/20 transition-colors group"
            >
              <span className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-foreground leading-none">Audio / BGM</span>
                {showBgm ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
              </span>
              <span className={cn(
                'block text-[10px] mt-0.5 truncate max-w-[80px]',
                hasSelection ? 'text-primary font-medium' : 'text-muted-foreground',
              )}>
                {activeBgmLabel}
              </span>
            </button>
            <div className="flex-1 px-3 py-2.5 flex items-center min-h-[44px]">
              {hasSelection ? (
                <div className="flex-1 h-9 bg-gradient-to-r from-green-500/15 via-green-500/25 to-green-500/15 rounded-lg flex items-center px-3 gap-2 min-w-[120px]">
                  <div className="flex gap-0.5 items-end h-4">
                    {[3,5,4,6,3,5,4,6,3].map((h, i) => (
                      <div key={i} className="w-0.5 bg-green-400/70 rounded-full" style={{ height: `${h * 3}px` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-green-400 font-medium truncate">{activeBgmLabel}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBgm(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Music className="w-3.5 h-3.5" />
                  Chọn nhạc nền...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── BGM Panel (expandable) ────────────────────────────────────── */}
        {showBgm && (
          <div id="bgm-panel" className="border-t border-border bg-background/30 px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Nhạc nền (BGM)</span>
              </div>
              <button type="button" onClick={() => setShowBgm(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors">
                Thu gọn
              </button>
            </div>

            {/* Upload zone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tải lên file nhạc</label>
              <input ref={fileInputRef} type="file" accept=".mp3,.wav,.ogg,.m4a" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetAudio(f); }} />
              <div onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) validateAndSetAudio(f); }}
                className={cn('flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                  uploadError ? 'border-destructive/50 bg-destructive/5 hover:border-destructive'
                  : uploadedFile ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
                  : 'border-border hover:border-primary/40 hover:bg-muted/20')}>
                {uploadedFile ? (
                  <><Music className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size/1024/1024).toFixed(2)} MB — Nhấn để đổi file</p>
                    </div></>
                ) : (
                  <><Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Kéo thả hoặc nhấn để chọn</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, OGG — tối đa {MAX_AUDIO_MB} MB</p>
                    </div></>
                )}
              </div>
              {uploadError && (
                <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{uploadError}
                </p>
              )}
            </div>

            {/* Preset library */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thư viện nhạc có sẵn</label>
              <div className="space-y-1.5">
                {PRESET_TRACKS.map((track) => {
                  const isActive = selectedTrack === track.id;
                  return (
                    <button key={track.id} type="button"
                      onClick={() => { setSelectedTrack(isActive ? null : track.id); setUploadedFile(null); setUploadError(null); }}
                      className={cn('w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all',
                        isActive ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                                 : 'bg-background border-border hover:border-primary/30')}>
                      <span className="flex items-center gap-2.5">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          <Play className="w-3 h-3" />
                        </div>
                        <span className="text-left">
                          <span className={cn('block text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{track.name}</span>
                          <span className="block text-[10px] text-muted-foreground">{track.mood}</span>
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{track.duration}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Âm lượng nhạc nền</label>
                <span className="text-xs font-mono text-primary font-semibold">{bgmVolume}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input type="range" min="0" max="100" value={bgmVolume} onChange={(e) => setBgmVolume(Number(e.target.value))}
                  className="flex-1 accent-primary" aria-label="Âm lượng nhạc nền" />
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              {!hasSelection && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5" />Chọn nhạc từ thư viện hoặc tải file lên
                </p>
              )}
              <button type="button" onClick={handleBgmSave} disabled={!hasSelection}
                className={cn('ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                  bgmSaved ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
                  : hasSelection ? 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
                  : 'bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-50')}>
                {bgmSaved ? <><CheckCircle2 className="w-4 h-4" />Đã lưu nhạc nền</> : 'Áp dụng nhạc nền'}
              </button>
            </div>
          </div>
        )}

        {/* Scrubber */}
        <div className="border-t border-border bg-background/40 px-5 py-3.5 space-y-3">
          <div className="relative h-5 flex items-center cursor-pointer group" role="slider" aria-label="Vị trí phát" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />
            <div className="absolute left-0 h-1 bg-primary rounded-full" style={{ width: `${progress}%` }} />
            <div className="absolute -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow group-hover:scale-125 transition-transform" style={{ left: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono tabular-nums">
                <span className="text-primary font-bold">00:14</span>
                <span className="text-muted-foreground"> / 00:59</span>
              </span>
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                <input type="range" className="w-18 accent-primary cursor-pointer" min="0" max="100"
                  value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Âm lượng" />
                <span className="text-[10px] text-muted-foreground tabular-nums w-7">{volume}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">10 clips · 59s</span>
              <button type="button" data-render="true"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" />RENDER VIDEO
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
