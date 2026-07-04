'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiEntry {
  name: string;
  connected: boolean;
  desc: string;
  docsUrl?: string;
}

const INITIAL_APIS: ApiEntry[] = [
  { name: 'OpenAI / GPT',  connected: true,  desc: 'Text generation & AI tasks',   docsUrl: 'https://platform.openai.com' },
  { name: 'ElevenLabs',    connected: true,  desc: 'Voice synthesis (TTS)',          docsUrl: 'https://elevenlabs.io' },
  { name: 'Runway ML',     connected: false, desc: 'Video generation (AI)',          docsUrl: 'https://runwayml.com' },
  { name: 'Google Cloud',  connected: false, desc: 'TTS, Translate & APIs',          docsUrl: 'https://console.cloud.google.com' },
];

export function ApiKeysSettings() {
  const [apis, setApis] = useState<ApiEntry[]>(INITIAL_APIS);

  const toggle = (name: string) => {
    setApis((prev) =>
      prev.map((a) => (a.name === name ? { ...a, connected: !a.connected } : a)),
    );
  };

  const connectedCount = apis.filter((a) => a.connected).length;

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">Quản lý API Keys</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {connectedCount}/{apis.length} dịch vụ đã kết nối
          </p>
        </div>
        {/* Mini progress */}
        <div className="flex gap-1">
          {apis.map((a) => (
            <div
              key={a.name}
              className={cn(
                'w-1.5 h-5 rounded-full transition-colors duration-300',
                a.connected ? 'bg-green-500/70' : 'bg-border',
              )}
            />
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {apis.map((api) => (
          <div
            key={api.name}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl border transition-all duration-150',
              api.connected
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-background/50 border-border hover:border-primary/20',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                api.connected ? 'bg-green-400' : 'bg-muted-foreground/40',
              )} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">{api.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{api.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              {api.docsUrl && (
                <a
                  href={api.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
                  title="Xem tài liệu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => toggle(api.name)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 cursor-pointer',
                  api.connected
                    ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25'
                    : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20',
                )}
              >
                {api.connected
                  ? <><CheckCircle2 className="w-3.5 h-3.5" />Kết nối</>
                  : <><AlertCircle className="w-3.5 h-3.5" />Chưa kết nối</>
                }
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Thêm API Key mới
      </button>
    </div>
  );
}
