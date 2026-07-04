'use client';

import { useState, useRef } from 'react';
import { Music, Upload, Volume2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const presetTracks = [
  { id: 1, name: 'Ambient Calm',      duration: '3:24', mood: 'Thư giãn' },
  { id: 2, name: 'Upbeat Corporate',  duration: '2:45', mood: 'Chuyên nghiệp' },
  { id: 3, name: 'Cinematic Epic',    duration: '4:10', mood: 'Hoành tráng' },
  { id: 4, name: 'Lo-fi Chill',       duration: '3:00', mood: 'Bình thản' },
];

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg'];
const MAX_FILE_MB = 20;

interface BackgroundMusicPanelProps {
  onClose: () => void;
}

export function BackgroundMusicPanel({ onClose }: BackgroundMusicPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [volume, setVolume] = useState(30);
  const [saved, setSaved] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSet(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  };

  const validateAndSet = (file: File) => {
    setUploadError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Chỉ chấp nhận file MP3, WAV, MP4 audio, OGG.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File quá lớn — tối đa ${MAX_FILE_MB} MB.`);
      return;
    }
    setUploadedFile(file);
    setSelectedTrack(null);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const hasSelection = uploadedFile !== null || selectedTrack !== null;

  return (
    <div className="panel-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-none">Nhạc nền</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tải lên hoặc chọn từ thư viện</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 px-2 py-1 rounded hover:bg-muted/50"
        >
          Đóng
        </button>
      </div>

      {/* Upload zone */}
      <div>
        <p className="field-label mb-2">Tải lên file nhạc</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,.m4a"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150',
            uploadError
              ? 'border-destructive/50 bg-destructive/5 hover:border-destructive'
              : uploadedFile
                ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
                : 'border-border hover:border-primary/40 hover:bg-muted/20',
          )}
        >
          {uploadedFile ? (
            <>
              <Music className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB — Nhấn để đổi file
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm text-foreground font-medium">Kéo thả hoặc nhấn để chọn</p>
                <p className="text-xs text-muted-foreground">MP3, WAV, OGG — tối đa {MAX_FILE_MB} MB</p>
              </div>
            </>
          )}
        </div>
        {uploadError && (
          <div className="field-error">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {uploadError}
          </div>
        )}
      </div>

      {/* Preset library */}
      <div>
        <p className="field-label mb-2">Thư viện nhạc có sẵn</p>
        <div className="space-y-1.5">
          {presetTracks.map((track) => {
            const isActive = selectedTrack === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => { setSelectedTrack(isActive ? null : track.id); setUploadedFile(null); setUploadError(null); }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                    : 'bg-background border-border hover:border-primary/30',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    <Play className="w-3 h-3" />
                  </div>
                  <span className="text-left">
                    <span className={cn('block text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                      {track.name}
                    </span>
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
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="field-label">Âm lượng nhạc nền</p>
          <span className="text-xs font-mono text-primary font-semibold">{volume}%</span>
        </div>
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Âm lượng nhạc nền"
          />
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-end pt-1 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasSelection}
          className={cn(
            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
            saved
              ? 'bg-green-600/20 border border-green-600/40 text-green-400 cursor-default'
              : hasSelection
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60',
          )}
        >
          {saved ? <><CheckCircle2 className="w-4 h-4" />Đã lưu</> : 'Áp dụng nhạc nền'}
        </button>
      </div>
    </div>
  );
}
