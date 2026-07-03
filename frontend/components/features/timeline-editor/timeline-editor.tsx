'use client';

import { Play, Pause, ChevronRight, ZoomIn, ZoomOut, Volume2 } from 'lucide-react';

export function TimelineEditor() {
  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
        4. TIMELINE - KÉO THẢ ĐỂ CHỈNH SỬA VIDEO
      </h2>

      <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background/30">
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
              <Play className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
              <Pause className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-sm font-mono text-foreground">00:00:00 / 00:59:00</div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
              <ZoomOut className="w-4 h-4" />
            </button>
            <input type="range" className="w-24 accent-primary" min="0" max="100" defaultValue="50" />
            <button className="p-2 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <div>
            <div className="flex bg-background/50 border-b border-border sticky top-0 z-10">
              <div className="w-32 flex-shrink-0 px-4 py-2 border-r border-border">
                <p className="text-xs font-semibold text-muted-foreground">TIMELINE</p>
              </div>
              <div className="flex-1 relative h-10">
                <div className="flex h-full">
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} className="flex-1 text-center text-xs text-muted-foreground border-r border-border/30 py-2">
                      {String(i).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex border-b border-border hover:bg-background/30 transition-colors">
              <div className="w-32 flex-shrink-0 px-4 py-3 border-r border-border bg-background/50">
                <p className="text-xs font-semibold text-foreground">Video</p>
                <p className="text-xs text-muted-foreground">10 Clips</p>
              </div>
              <div className="flex-1 px-4 py-3 flex gap-2 overflow-x-auto">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-shrink-0 w-24 h-12 bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 rounded flex items-center justify-center text-xs font-bold text-primary">
                    #{i}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex border-b border-border hover:bg-background/30 transition-colors">
              <div className="w-32 flex-shrink-0 px-4 py-3 border-r border-border bg-background/50">
                <p className="text-xs font-semibold text-foreground">Transition</p>
                <p className="text-xs text-muted-foreground">Fade In</p>
              </div>
              <div className="flex-1 px-4 py-3 flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">Các chuyển tiếp tự động</span>
              </div>
            </div>

            <div className="flex border-b border-border hover:bg-background/30 transition-colors">
              <div className="w-32 flex-shrink-0 px-4 py-3 border-r border-border bg-background/50">
                <p className="text-xs font-semibold text-foreground">Audio</p>
                <p className="text-xs text-muted-foreground">BGM</p>
              </div>
              <div className="flex-1 px-4 py-3">
                <div className="h-10 bg-gradient-to-r from-green-500/20 via-green-500/30 to-green-500/20 rounded flex items-center px-3">
                  <div className="text-xs text-green-400 font-mono">♪♪♪ Waveform</div>
                </div>
              </div>
            </div>

            <div className="flex border-b border-border hover:bg-background/30 transition-colors">
              <div className="w-32 flex-shrink-0 px-4 py-3 border-r border-border bg-background/50">
                <p className="text-xs font-semibold text-foreground">Voiceover</p>
                <p className="text-xs text-muted-foreground">TTS 1</p>
              </div>
              <div className="flex-1 px-4 py-3 flex gap-2 overflow-x-auto">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex-shrink-0 bg-primary/20 border border-primary/30 rounded px-2 py-1 text-xs text-primary/80 font-medium whitespace-nowrap">
                    &quot;He discovers...&quot;
                  </div>
                ))}
              </div>
            </div>

            <div className="flex border-b border-border hover:bg-background/30 transition-colors">
              <div className="w-32 flex-shrink-0 px-4 py-3 border-r border-border bg-background/50">
                <p className="text-xs font-semibold text-foreground">Subtitle</p>
                <p className="text-xs text-muted-foreground">Auto</p>
              </div>
              <div className="flex-1 px-4 py-3 flex gap-2 overflow-x-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 bg-accent/20 border border-accent/30 rounded px-2 py-1 text-xs text-accent/80 font-medium whitespace-nowrap">
                    &quot;Subtitle {i}&quot;
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/50 px-6 py-4 space-y-3">
          <div className="relative h-6 flex items-center group cursor-pointer">
            <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full" />
            <div className="absolute left-0 h-1.5 w-[24%] bg-primary rounded-full" />
            <div className="absolute left-[24%] -translate-x-1/2 w-3.5 h-3.5 bg-primary rounded-full border-2 border-background shadow-md group-hover:scale-110 transition-transform" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-mono text-sm">
                <span className="text-primary font-semibold">00:14:12</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">00:59:00</span>
              </div>
              <div className="flex items-center gap-2 pl-4 border-l border-border">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <input type="range" className="w-20 accent-primary" min="0" max="100" defaultValue="80" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline">10 clips · 59s</span>
              <button className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors">
                RENDER VIDEO
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
