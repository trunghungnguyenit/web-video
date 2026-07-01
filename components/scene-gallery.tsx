'use client';

import { Plus, Edit2, Mic, ImageIcon, Trash2, MoreHorizontal, Grid3x3, ArrowUpDown } from 'lucide-react';

const scenes = [
  { id: 1, time: '00:00 - 00:05', prompt: 'A man stands at the entrance of a dark cave...', voice: 'He discovers ancient drawings inside', duration: '5.0s' },
  { id: 2, time: '00:05 - 00:11', prompt: 'The man holds a lantern and explores...', voice: 'The cave walls glow with mysterious light', duration: '6.0s' },
  { id: 3, time: '00:11 - 00:17', prompt: 'A mysterious creature walks by...', voice: 'He hears a strange sound and shivers', duration: '6.0s' },
  { id: 4, time: '00:17 - 00:23', prompt: 'The man climbs up a stone ladder...', voice: 'Finally reaching the surface', duration: '6.0s' },
  { id: 5, time: '00:23 - 00:28', prompt: 'Sunlight floods the cave entrance...', voice: 'The adventure comes to an end', duration: '5.0s' },
  { id: 6, time: '00:28 - 00:33', prompt: 'The man looks back at the cave...', voice: 'Ready for the next exploration', duration: '5.0s' },
  { id: 7, time: '00:33 - 00:39', prompt: 'Ancient symbols shine brightly...', voice: 'The mystery deepens', duration: '6.0s' },
  { id: 8, time: '00:39 - 00:45', prompt: 'A hidden door appears...', voice: 'Another passage awaits', duration: '6.0s' },
  { id: 9, time: '00:45 - 00:51', prompt: 'The character enters hesitantly...', voice: 'What lies ahead?', duration: '6.0s' },
  { id: 10, time: '00:51 - 00:59', prompt: 'Final scene with dramatic lighting...', voice: 'To be continued...', duration: '8.0s' },
];

export function SceneGallery() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          4. DANH SÁCH CẢNH (10)
        </h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Thêm cảnh
          </button>
          <button className="px-4 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-card transition-colors flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Sắp xếp
          </button>
          <button className="px-4 py-2 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-card transition-colors flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Chọn tất cả
          </button>
        </div>
      </div>

      {/* Scene Cards Grid - Horizontal Scrollable */}
      <div className="overflow-x-auto pb-4 -mx-8 px-8">
        <div className="flex gap-4 min-w-min">
          {scenes.map((scene) => (
            <div key={scene.id} className="flex-shrink-0 w-40 bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors group">
              {/* Thumbnail */}
              <div className="w-40 h-28 bg-muted relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
                
                {/* Badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {scene.id}
                </div>

                {/* Time */}
                <div className="absolute top-2 right-2 text-xs font-semibold bg-background/80 px-2 py-1 rounded text-foreground">
                  {scene.time.split(' - ')[1]}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Video Prompt</p>
                  <p className="text-xs text-foreground line-clamp-2">{scene.prompt}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Voice (TTS)</p>
                  <p className="text-xs text-foreground line-clamp-1">{scene.voice}</p>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{scene.duration}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="px-3 py-2 bg-card/50 border-t border-border flex items-center justify-between gap-1">
                <button className="p-1.5 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-destructive/10 rounded transition-colors text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-primary">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
