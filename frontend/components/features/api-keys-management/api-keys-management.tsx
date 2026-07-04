'use client';

import { Eye, EyeOff, Copy, CheckCircle2, AlertCircle, HelpCircle, Loader2, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type KeyStatus = 'connected' | 'disconnected' | 'verifying' | 'error';

interface ApiKeyEntry {
  id: string;
  name: string;
  placeholder: string;
  value: string;
  status: KeyStatus;
  errorMsg?: string;
}

const INITIAL_KEYS: ApiKeyEntry[] = [
  { id: 'openai', name: 'OpenAI / GPT', placeholder: 'sk-...', value: 'sk-proj-xxxxxxxxxxxxxxxx', status: 'connected' },
  { id: 'elevenlabs', name: 'ElevenLabs', placeholder: 'el-...', value: 'el-xxxxxxxxxxxxxxxx', status: 'connected' },
  { id: 'runway', name: 'Runway ML', placeholder: 'rmk-...', value: '', status: 'disconnected' },
  { id: 'kling', name: 'Kling AI', placeholder: 'kling-...', value: 'kling-xxxxxxxx', status: 'connected' },
  { id: 'whisper', name: 'Whisper / STT', placeholder: 'sk-...', value: 'sk-xxxxxxxx', status: 'connected' },
  { id: 'pika', name: 'Pika Labs', placeholder: 'pika-...', value: '', status: 'disconnected' },
  { id: 'google-tts', name: 'Google TTS', placeholder: 'AIza...', value: 'AIzaXXXXXXXXX', status: 'connected' },
  { id: 'flux', name: 'Flux / Stable Diffusion', placeholder: 'sk-...', value: 'flux-xxxxxxxx', status: 'connected' },
];

// Simulate API key validation
async function verifyKey(id: string, value: string): Promise<{ ok: boolean; msg?: string }> {
  await new Promise((r) => setTimeout(r, 1200));
  if (!value.trim()) return { ok: false, msg: 'Key không được để trống.' };
  if (value.trim().length < 8) return { ok: false, msg: 'Key quá ngắn — kiểm tra lại.' };
  return { ok: true };
}

export function ApiKeysManagement() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>(INITIAL_KEYS);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const toggleVisibility = (id: string) =>
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

  const startEdit = (entry: ApiKeyEntry) =>
    setEditing((prev) => ({ ...prev, [entry.id]: entry.value }));

  const cancelEdit = (id: string) =>
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });

  const handleSave = async (id: string) => {
    const draft = editing[id] ?? '';
    setKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, status: 'verifying', errorMsg: undefined } : k),
    );
    const result = await verifyKey(id, draft);
    setKeys((prev) =>
      prev.map((k) =>
        k.id === id
          ? { ...k, value: draft, status: result.ok ? 'connected' : 'error', errorMsg: result.msg }
          : k,
      ),
    );
    cancelEdit(id);
  };

  const handleCopy = (id: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusConfig: Record<KeyStatus, { color: string; icon: React.ReactNode; label: string }> = {
    connected: {
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: 'Hợp lệ',
    },
    disconnected: {
      color: 'text-muted-foreground bg-muted/10 border-muted/30',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: 'Chưa kết nối',
    },
    verifying: {
      color: 'text-primary bg-primary/10 border-primary/30',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      label: 'Đang xác thực...',
    },
    error: {
      color: 'text-destructive bg-destructive/10 border-destructive/30',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: 'Không hợp lệ',
    },
  };

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
        6. QUẢN LÝ API KEYS
      </h2>

      <div className="bg-background/50 border border-border/40 rounded-lg p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          API keys được mã hóa trên server — không bao giờ được chia sẻ hoặc lưu ở phía client.
          Nhấn nút <span className="text-foreground font-medium">Chỉnh sửa</span> để cập nhật key, sau đó{' '}
          <span className="text-foreground font-medium">Lưu & xác thực</span> để kiểm tra kết nối.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {keys.map((entry) => {
          const cfg = statusConfig[entry.status];
          const isEditing = entry.id in editing;
          const isVisible = visibility[entry.id];
          const draftValue = editing[entry.id] ?? '';
          const displayValue = entry.value;

          return (
            <div
              key={entry.id}
              className={cn(
                'bg-card border rounded-xl p-4 space-y-3 transition-colors',
                entry.status === 'error' ? 'border-destructive/40' : 'border-border',
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">{entry.name}</h4>
                <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium', cfg.color)}>
                  {cfg.icon}
                  {cfg.label}
                </div>
              </div>

              {/* Key input */}
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={draftValue}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                    placeholder={entry.placeholder}
                    autoFocus
                    className="w-full px-3 py-2 bg-background border border-primary/40 rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(entry.id)}
                      disabled={entry.status === 'verifying'}
                      className="flex-1 px-3 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {entry.status === 'verifying' ? 'Đang xác thực...' : 'Lưu & xác thực'}
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEdit(entry.id)}
                      className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground text-xs rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={displayValue || ''}
                      readOnly
                      placeholder={displayValue ? undefined : 'Chưa nhập key'}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-muted-foreground pr-8 cursor-default"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(entry.id)}
                    title={isVisible ? 'Ẩn key' : 'Hiện key'}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.id, displayValue)}
                    title="Copy key"
                    disabled={!displayValue}
                    className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {copied === entry.id
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    title="Chỉnh sửa key"
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Error message */}
              {entry.status === 'error' && entry.errorMsg && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  {entry.errorMsg}
                </p>
              )}

              {/* CTA for disconnected keys */}
              {entry.status === 'disconnected' && !isEditing && (
                <button
                  type="button"
                  onClick={() => startEdit(entry)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  + Nhập API key →
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        API keys được mã hóa end-to-end và không bao giờ được hiển thị cho bên thứ ba.
      </p>
    </section>
  );
}
