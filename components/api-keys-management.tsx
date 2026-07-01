'use client';

import { Eye, EyeOff, Copy, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { useState } from 'react';

const apiKeys = [
  { name: 'OpenAI / GPT', key: 'sk..............................', status: 'connected' as const },
  { name: 'ElevenLabs', key: 'sk..............................', status: 'connected' as const },
  { name: 'Runway ML', key: 'rmk..............................', status: 'disconnected' as const, help: true },
  { name: 'Kling AI', key: 'kling..............................', status: 'connected' as const },
  { name: 'Whisper / STT', key: 'whisper..............................', status: 'connected' as const },
  { name: 'Pika Labs', key: 'pika..............................', status: 'disconnected' as const },
  { name: 'Google TTS', key: 'gts..............................', status: 'connected' as const },
  { name: 'Flux / Stable Diffusion', key: 'flux..............................', status: 'connected' as const },
];

export function ApiKeysManagement() {
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const toggleVisibility = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
        6. QUẢN LÝ API KEYS
      </h2>

      <div className="bg-background/50 border border-border/30 rounded-lg p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          API keys được mã hóa trên server. Nhập tại đây để sử dụng các dịch vụ AI. Không chia sẻ key của bạn.
        </p>
      </div>

      {/* API Keys Grid */}
      <div className="grid grid-cols-2 gap-4">
        {apiKeys.map((item) => {
          const statusConfig = {
            connected: {
              color: 'text-green-400 bg-green-500/10 border-green-500/30',
              icon: <CheckCircle2 className="w-4 h-4" />,
              label: 'Hợp lệ',
            },
            disconnected: {
              color: 'text-muted-foreground bg-muted/10 border-muted/30',
              icon: <AlertCircle className="w-4 h-4" />,
              label: 'Chưa kết nối',
            },
          };

          const config = statusConfig[item.status];

          return (
            <div key={item.name} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${config.color}`}>
                  {config.icon}
                  {config.label}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type={visibility[item.name] ? 'text' : 'password'}
                  value={item.key}
                  readOnly
                  className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs font-mono text-muted-foreground"
                />
                <button
                  onClick={() => toggleVisibility(item.name)}
                  className="p-2 hover:bg-card rounded transition-colors"
                  title={visibility[item.name] ? 'Hide' : 'Show'}
                >
                  {visibility[item.name] ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
                <button className="p-2 hover:bg-card rounded transition-colors">
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>

              {item.help && (
                <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
                  Nhập tại đây để sử dụng API key của bạn
                </div>
              )}

              {item.status === 'disconnected' && !item.help && (
                <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                  Nhập key →
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        API keys được bảo mật và không bao giờ được chia sẻ công khai
      </p>
    </section>
  );
}
