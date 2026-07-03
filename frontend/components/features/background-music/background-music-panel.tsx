'use client';

import { Music, Upload, Volume2 } from 'lucide-react';

const presetTracks = [
  { id: 1, name: 'Ambient Calm', duration: '3:24' },
  { id: 2, name: 'Upbeat Corporate', duration: '2:45' },
  { id: 3, name: 'Cinematic Epic', duration: '4:10' },
  { id: 4, name: 'Lo-fi Chill', duration: '3:00' },
];

interface BackgroundMusicPanelProps {
  onClose: () => void;
}

export function BackgroundMusicPanel({ onClose }: BackgroundMusicPanelProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Thêm nhạc nền</h3>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Đóng
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Thêm nhạc nền cho video — tải lên file hoặc chọn từ thư viện</p>

      <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-primary/40 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors">
        <Upload className="w-4 h-4" />
        Tải lên file nhạc (MP3, WAV)
      </button>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          Thư viện nhạc có sẵn
        </label>
        <div className="space-y-2">
          {presetTracks.map((track) => (
            <button
              key={track.id}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-background border border-border rounded-lg text-sm hover:border-primary/50 transition-colors group"
            >
              <span className="flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
                <Music className="w-4 h-4 text-muted-foreground" />
                {track.name}
              </span>
              <span className="text-xs text-muted-foreground">{track.duration}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
          Âm lượng nhạc nền
        </label>
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <input type="range" min="0" max="100" defaultValue="30" className="flex-1 accent-primary" />
          <span className="text-xs text-muted-foreground w-8">30%</span>
        </div>
      </div>
    </div>
  );
}
