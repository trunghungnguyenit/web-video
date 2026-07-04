'use client';

import { useState } from 'react';
import { Play, Pause, SkipBack, ZoomIn, ZoomOut, Volume2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const TRACKS = [
  {
    id: 'video',
    label: 'Video',
    sub: '10 clips',
    clips: [1, 2, 3, 4, 5],
    type: 'video' as const,
  },
  {
    id: 'transition',
    label: 'Transition',
    sub: 'Fade In',
    clips: [],
    type: 'transition' as const,
  },
  {
    id: 'audio',
    label: 'Audio',
    sub: 'BGM',
    clips: [],
    type: 'audio' as const,
  },
  {
    id: 'voiceover',
    label: 'Voiceover',
    sub: 'TTS 1',
    clips: [1, 2, 3, 4, 5],
    type: 'voice' as const,
  },
  {
    id: 'subtitle',
    label: 'Subtitle',
    sub: 'Auto',
    clips: [1, 2, 3],
    type: 'subtitle' as const,
  },
];

const TIMELINE_MARKS = Array.from({ length: 20 }, (_, i) => i * 3); // 0, 3, 6 ... 57s

export function TimelineEditor() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [zoom, setZoom] = useState(50);
  const [progress] = useState(24); // percent

  return (
    <section className="space-y-4">
      <h2 className="section-label">4. Timeline — Chỉnh sửa video</h2>

      <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-background/40 gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors duration-150 text-muted-foreground hover:text-primary cursor-pointer"
              aria-label="Quay về đầu"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((v) => !v)}
              className="p-2 hover:bg-primary/10 rounded-lg transition-colors duration-150 text-muted-foreground hover:text-primary cursor-pointer"
              aria-label={isPlaying ? 'Dừng' : 'Phát'}
            >
              {isPlaying
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4" />
              }
            </button>
            <div className="text-xs font-mono text-foreground ml-2 tabular-nums">
              <span className="text-primary font-semibold">00:14</span>
              <span className="text-muted-foreground"> / 00:59</span>
            </div>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((v) => Math.max(10, v - 10))}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              className="w-20 accent-primary cursor-pointer"
              min="10" max="100"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom timeline"
            />
            <button
              type="button"
              onClick={() => setZoom((v) => Math.min(100, v + 10))}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Track area */}
        <div className="overflow-x-auto">
          {/* Time ruler */}
          <div className="flex border-b border-border bg-background/50 sticky top-0 z-10">
            <div className="w-28 flex-shrink-0 px-4 py-2 border-r border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Track</span>
            </div>
            <div className="flex-1 flex h-8">
              {TIMELINE_MARKS.map((s) => (
                <div
                  key={s}
                  className="flex-1 text-center border-r border-border/30 flex items-end pb-1"
                >
                  <span className="text-[10px] text-muted-foreground/60 w-full">{s}s</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          {TRACKS.map((track) => (
            <div key={track.id} className="flex border-b border-border row-hover">
              {/* Label */}
              <div className="w-28 flex-shrink-0 px-4 py-3 border-r border-border bg-background/30">
                <span className="block text-xs font-semibold text-foreground leading-none">{track.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">{track.sub}</span>
              </div>

              {/* Content */}
              <div className="flex-1 px-3 py-2.5 flex items-center gap-2 overflow-x-auto min-h-[44px]">
                {track.type === 'video' && track.clips.map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-20 h-9 bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/25 rounded-lg flex items-center justify-center text-xs font-bold text-primary/80 cursor-grab active:cursor-grabbing"
                  >
                    #{i}
                  </div>
                ))}

                {track.type === 'transition' && (
                  <span className="text-xs text-muted-foreground italic">Fade — tự động</span>
                )}

                {track.type === 'audio' && (
                  <div className="flex-1 h-9 bg-gradient-to-r from-green-500/15 via-green-500/25 to-green-500/15 rounded-lg flex items-center px-3 gap-2 min-w-[120px]">
                    <div className="flex gap-0.5 items-end h-4">
                      {[3, 5, 4, 6, 3, 5, 4, 6, 3].map((h, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-green-400/70 rounded-full"
                          style={{ height: `${h * 3}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-green-400 font-medium">BGM Waveform</span>
                  </div>
                )}

                {track.type === 'voice' && track.clips.map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 bg-primary/15 border border-primary/25 rounded-lg px-2.5 py-1 text-[11px] text-primary/80 font-medium whitespace-nowrap cursor-grab"
                  >
                    Cảnh {i}...
                  </div>
                ))}

                {track.type === 'subtitle' && track.clips.map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1 text-[11px] text-accent/70 font-medium whitespace-nowrap cursor-grab"
                  >
                    Sub {i}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Scrubber + footer */}
        <div className="border-t border-border bg-background/40 px-5 py-3.5 space-y-3">
          {/* Scrubber */}
          <div
            className="relative h-5 flex items-center cursor-pointer group"
            role="slider"
            aria-label="Vị trí phát"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="absolute inset-x-0 h-1 bg-muted rounded-full" />
            <div
              className="absolute left-0 h-1 bg-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow group-hover:scale-125 transition-transform duration-100"
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono tabular-nums">
                <span className="text-primary font-bold">00:14</span>
                <span className="text-muted-foreground"> / 00:59</span>
              </span>
              <div className="flex items-center gap-2 pl-3 border-l border-border">
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="range"
                  className="w-18 accent-primary cursor-pointer"
                  min="0" max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Âm lượng"
                />
                <span className="text-[10px] text-muted-foreground tabular-nums w-7">{volume}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">10 clips · 59s</span>
              <button
                type="button"
                data-render="true"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-xs transition-colors duration-150 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                RENDER VIDEO
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
