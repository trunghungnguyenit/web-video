'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Square, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VOICE_OPTIONS } from '@/lib/saved-scripts';
import { getApiKey, API_KEY_IDS } from '@/lib/api-keys-store';
import { getVoicePreviewText, voicePreviewCacheKey } from '@/lib/voice-preview';
import { ttsService } from '@/services/tts.service';

interface VoiceSelectProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  voiceSpeed?: number;
  options?: readonly [string, string][];
  id?: string;
  selectClassName?: string;
  compact?: boolean;
}

export function VoiceSelect({
  value,
  onChange,
  language,
  voiceSpeed = 1,
  options = VOICE_OPTIONS,
  id,
  selectClassName,
  compact = false,
}: VoiceSelectProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const objectUrlsRef = useRef<string[]>([]);

  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopPreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPreviewing(false);
  }, []);

  useEffect(() => () => {
    stopPreview();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    cacheRef.current.clear();
  }, [stopPreview]);

  useEffect(() => {
    stopPreview();
  }, [value, language, voiceSpeed, stopPreview]);

  const handlePreview = useCallback(async () => {
    setError(null);

    if (previewing) {
      stopPreview();
      return;
    }

    const apiKey = getApiKey(API_KEY_IDS.elevenlabs);
    if (!apiKey) {
      setError('Chưa có API key ElevenLabs — vào Cài đặt → API Keys.');
      return;
    }

    const cacheKey = voicePreviewCacheKey(value, language, voiceSpeed);
    let objectUrl = cacheRef.current.get(cacheKey);

    setLoading(true);
    try {
      if (!objectUrl) {
        const blob = await ttsService.synthesize({
          apiKey,
          text: getVoicePreviewText(language),
          ttsInput: { voice: value, language, voiceSpeed },
        });
        objectUrl = URL.createObjectURL(blob);
        cacheRef.current.set(cacheKey, objectUrl);
        objectUrlsRef.current.push(objectUrl);
      }

      const audio = audioRef.current;
      if (!audio) return;

      audio.src = objectUrl;
      await audio.play();
      setPreviewing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không phát được giọng mẫu.');
      stopPreview();
    } finally {
      setLoading(false);
    }
  }, [value, language, voiceSpeed, previewing, stopPreview]);

  return (
    <div className="space-y-1.5">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors',
          compact && 'px-2.5 py-2 text-xs',
          selectClassName,
        )}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => void handlePreview()}
        disabled={loading}
        title={previewing ? 'Dừng nghe thử' : 'Nghe thử giọng đã chọn'}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50',
          compact ? 'py-2' : 'py-2.5',
          previewing
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
            : 'border-border bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5',
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : previewing ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Dừng nghe thử</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5" />
            <span>{compact ? 'Nghe thử' : 'Nghe thử giọng mẫu'}</span>
          </>
        )}
      </button>

      {error && (
        <p className="flex items-start gap-1 text-[11px] text-destructive leading-relaxed">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setPreviewing(false)}
      />
    </div>
  );
}
