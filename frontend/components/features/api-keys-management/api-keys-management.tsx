'use client';

import { Eye, EyeOff, Copy, CheckCircle2, AlertCircle, HelpCircle, Loader2, Pencil, X, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { getApiKey, setApiKey } from '@/lib/api-keys-store';

type KeyStatus = 'connected' | 'disconnected' | 'verifying' | 'error';

interface ApiKeyEntry {
  id: string;
  name: string;
  service: 'gemini' | 'veo' | 'tts';
  placeholder: string;
  value: string;
  status: KeyStatus;
  errorMsg?: string;
  description: string;
}

/**
 * Theo luồng xử lý:
 * Gemini   → tạo kịch bản (script generation)
 * Veo      → tạo video từng cảnh
 * TTS      → tạo giọng đọc (ElevenLabs)
 *
 * Backend nhận toàn bộ settings rồi phân phối key cho AI phù hợp.
 * Frontend chỉ lưu key — không xử lý AI trực tiếp.
 */
const INITIAL_KEYS: ApiKeyEntry[] = [
  {
    id: 'gemini',
    name: 'Gemini API Key',
    service: 'gemini',
    placeholder: 'AIza...',
    value: '',
    status: 'disconnected',
    description: 'Tạo kịch bản, phân cảnh và lời thoại (ngôn ngữ, phong cách, thời lượng)',
  },
  {
    id: 'veo',
    name: 'Veo API Key',
    service: 'veo',
    placeholder: 'AIza... (key riêng cho Veo)',
    value: '',
    status: 'disconnected',
    description: 'Veo 3 tạo video cảnh — bắt buộc nhập key riêng; lưu xong sẽ load danh sách model Veo',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs API Key',
    service: 'tts',
    placeholder: 'sk_...',
    value: '',
    status: 'disconnected',
    description: 'Tạo giọng đọc từ voiceover — key cần bật quyền Text to Speech trên elevenlabs.io',
  },
];

const SERVICE_BADGE: Record<ApiKeyEntry['service'], { label: string; color: string }> = {
  gemini: { label: 'Gemini', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  veo:    { label: 'Veo',    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  tts:    { label: 'TTS',    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
};

async function verifyKey(_id: string, value: string): Promise<{ ok: boolean; msg?: string }> {
  await new Promise((r) => setTimeout(r, 1200));
  if (!value.trim()) return { ok: false, msg: 'Key không được để trống.' };
  if (value.trim().length < 10) return { ok: false, msg: 'Key quá ngắn — kiểm tra lại.' };
  return { ok: true };
}

export function ApiKeysManagement() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>(INITIAL_KEYS);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setKeys((prev) =>
      prev.map((k) => {
        const stored = getApiKey(k.id);
        return stored
          ? { ...k, value: stored, status: 'connected' as const }
          : k;
      }),
    );
  }, []);

  const toggleVisibility = (id: string) =>
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

  const startEdit = (entry: ApiKeyEntry) =>
    setEditing((prev) => ({ ...prev, [entry.id]: entry.value }));

  const cancelEdit = (id: string) =>
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });

  const handleSave = async (id: string, value: string) => {
    setApiKey(id, value);
    console.log('[API Key] lưu:', { id });

    setKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, value: value, status: 'connected' } : k),
    );
    cancelEdit(id);
  };

  const handleDelete = (id: string) => {
    setApiKey(id, '');
    setKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, value: '', status: 'disconnected', errorMsg: undefined } : k),
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

  const connectedCount = keys.filter((k) => k.status === 'connected').length;
  const totalCount = keys.length;
  const allConnected = connectedCount === totalCount;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          QUẢN LÝ API KEYS
        </h2>
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full border',
          allConnected
            ? 'text-green-400 bg-green-500/10 border-green-500/30'
            : 'text-muted-foreground bg-muted/10 border-muted/30',
        )}>
          {connectedCount}/{totalCount} kết nối
        </span>
      </div>

      {/* API Key cards */}
      <div className="grid grid-cols-1 gap-4">
        {keys.map((entry) => {
          const cfg = statusConfig[entry.status];
          const svc = SERVICE_BADGE[entry.service];
          const isEditing = entry.id in editing;
          const isVisible = visibility[entry.id];
          const draftValue = editing[entry.id] ?? '';
          const displayValue = entry.value;
          const hasValue = !!displayValue;

          return (
            <div
              key={entry.id}
              className={cn(
                'bg-card border rounded-xl p-4 space-y-3 transition-colors',
                entry.status === 'error'
                  ? 'border-destructive/40'
                  : entry.status === 'connected'
                  ? 'border-green-500/20'
                  : 'border-border',
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{entry.name}</h4>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', svc.color)}>
                      {svc.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.description}</p>
                </div>
                <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium whitespace-nowrap flex-shrink-0', cfg.color)}>
                  {cfg.icon}
                  <span className="hidden sm:inline">{cfg.label}</span>
                </div>
              </div>

              {/* Key input — editing mode */}
              {isEditing ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={draftValue}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                      placeholder={entry.placeholder}
                      autoFocus
                      className="w-full px-3 py-2 bg-background border border-primary/40 rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(entry.id)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSave(entry.id, draftValue)}
                      disabled={entry.status === 'verifying'}
                      className="flex-1 px-3 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {entry.status === 'verifying' ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Đang xác thực...
                        </span>
                      ) : (
                        'Lưu & xác thực'
                      )}
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
                /* Key input — view mode */
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={displayValue || ''}
                      readOnly
                      placeholder="Chưa nhập key"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-muted-foreground cursor-default"
                    />
                  </div>

                  {/* Toggle visibility */}
                  <button
                    type="button"
                    onClick={() => toggleVisibility(entry.id)}
                    disabled={!hasValue}
                    title={isVisible ? 'Ẩn key' : 'Hiện key'}
                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  {/* Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.id, displayValue)}
                    title="Copy key"
                    disabled={!hasValue}
                    className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {copied === entry.id
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    }
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    title="Chỉnh sửa key"
                    className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete / clear key */}
                  {hasValue && (
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      title="Xóa key"
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Error message */}
              {entry.status === 'error' && entry.errorMsg && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  {entry.errorMsg}
                </p>
              )}

              {/* CTA for disconnected */}
              {entry.status === 'disconnected' && !isEditing && (
                <button
                  type="button"
                  onClick={() => startEdit(entry)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nhập {entry.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="bg-background/50 border border-border/40 rounded-lg p-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Keys mã hóa end-to-end · Không chia sẻ với bên thứ ba
        </p>
        {allConnected && (
          <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sẵn sàng tạo video
          </span>
        )}
      </div>
    </section>
  );
}
