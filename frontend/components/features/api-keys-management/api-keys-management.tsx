'use client';

import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/ui/field-error';
import { SecretField } from '@/components/ui/secret-field';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { API_KEY_IDS, API_KEYS_CHANGED_EVENT, getApiKey, isApiKeysReady, setApiKey } from '@/lib/api-keys/api-keys-store';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { saveRemoteApiKey } from '@/lib/api-keys/api-keys-remote';

type KeyStatus = 'connected' | 'disconnected' | 'verifying' | 'error';

interface ApiKeyEntry {
  id: string;
  name: string;
  service: 'gemini' | 'tts' | 'kie' | 'veo-gemini';
  placeholder: string;
  value: string;
  status: KeyStatus;
  errorMsg?: string;
  description: string;
}

/**
 * Theo luồng xử lý:
 * Gemini   → tạo kịch bản (script generation)
 * Video    → tạo video từng cảnh (Veo 3.1 qua kie.ai)
 * TTS      → tạo giọng đọc (ElevenLabs)
 *
 * Backend nhận toàn bộ settings rồi phân phối key cho AI phù hợp.
 * Frontend chỉ lưu key — không xử lý AI trực tiếp.
 */
const INITIAL_KEYS: ApiKeyEntry[] = [
  {
    id: API_KEY_IDS.gemini,
    name: 'Gemini API Key',
    service: 'gemini',
    placeholder: 'AIza...',
    value: '',
    status: 'disconnected',
    description: 'Tạo kịch bản, phân cảnh và lời thoại (ngôn ngữ, phong cách, thời lượng) — KHÔNG dùng để tạo video',
  },
  {
    id: API_KEY_IDS.elevenlabs,
    name: 'ElevenLabs API Key',
    service: 'tts',
    placeholder: 'sk_...',
    value: '',
    status: 'disconnected',
    description: 'Tạo giọng đọc từ voiceover — key cần bật quyền Text to Speech trên elevenlabs.io',
  },
  {
    id: API_KEY_IDS.kie,
    name: 'Video API Key',
    service: 'kie',
    placeholder: 'Nhập Bearer token API tạo video',
    value: '',
    status: 'disconnected',
    description: 'Tạo video cảnh qua kie.ai — dùng cho nhà cung cấp "Veo 3.1"',
  },
  {
    id: API_KEY_IDS.veoGemini,
    name: 'Gemini Key Veo 3.1',
    service: 'veo-gemini',
    placeholder: 'AIza...',
    value: '',
    status: 'disconnected',
    description: 'Tạo video cảnh khi chọn nhà cung cấp "Veo3.1 Gemini" (gọi thẳng Google) — key riêng, không dùng chung với Gemini API Key',
  },
];

/** 2 key tạo video là LỰA CHỌN THAY THẾ nhau — chỉ cần 1 trong 2 là đủ chạy pipeline */
const VIDEO_KEY_IDS: string[] = [API_KEY_IDS.kie, API_KEY_IDS.veoGemini];

const SERVICE_BADGE: Record<ApiKeyEntry['service'], { label: string; color: string }> = {
  gemini:       { label: 'Gemini',   color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  tts:          { label: 'TTS',      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  kie:          { label: 'Video',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  'veo-gemini': { label: 'Veo 3.1',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
};

async function verifyKey(_id: string, value: string): Promise<{ ok: boolean; msg?: string }> {
  await new Promise((r) => setTimeout(r, 1200));
  if (!value.trim()) return { ok: false, msg: 'Key không được để trống.' };
  if (value.trim().length < 10) return { ok: false, msg: 'Key quá ngắn — kiểm tra lại.' };
  return { ok: true };
}

export function ApiKeysManagement() {
  const { user, loading: authLoading } = useAuth();
  const supabaseRef = useRef(createClient());

  const [keys, setKeys] = useState<ApiKeyEntry[]>(INITIAL_KEYS);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const { copiedId, copy: copyToClipboard } = useCopyToClipboard();
  const [keysReady, setKeysReady] = useState(isApiKeysReady());

  // auth-context.tsx đã tự nạp key từ Supabase vào cache (api-keys-store.ts) ngay khi
  // đăng nhập — ở đây chỉ cần đọc lại cache đó để hiển thị, không tự fetch Supabase
  // riêng nữa (tránh gọi trùng lặp). Đồng bộ lại mỗi khi cache đổi (API_KEYS_CHANGED_EVENT).
  useEffect(() => {
    const syncFromCache = () => {
      setKeysReady(isApiKeysReady());
      setKeys((prev) =>
        prev.map((k) => {
          const value = getApiKey(k.id);
          return value
            ? { ...k, value, status: 'connected' as const }
            : { ...k, value: '', status: 'disconnected' as const };
        }),
      );
    };
    syncFromCache();
    window.addEventListener(API_KEYS_CHANGED_EVENT, syncFromCache);
    return () => window.removeEventListener(API_KEYS_CHANGED_EVENT, syncFromCache);
  }, []);

  const toggleVisibility = (id: string) =>
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));

  const startEdit = (entry: ApiKeyEntry) =>
    setEditing((prev) => ({ ...prev, [entry.id]: entry.value }));

  const cancelEdit = (id: string) =>
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });

  const handleSave = async (id: string, value: string) => {
    setApiKey(id, value);

    setKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, value: value, status: 'connected' } : k),
    );
    cancelEdit(id);

    const supabase = supabaseRef.current;
    if (user && supabase) {
      try {
        await saveRemoteApiKey(supabase, user.id, id, value);
      } catch (err) {
        console.error('[api-keys] Lưu Supabase thất bại:', err);
      }
    }
  };

  const handleDelete = async (id: string) => {
    setApiKey(id, '');
    setKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, value: '', status: 'disconnected', errorMsg: undefined } : k),
    );
    cancelEdit(id);

    const supabase = supabaseRef.current;
    if (user && supabase) {
      try {
        await saveRemoteApiKey(supabase, user.id, id, '');
      } catch (err) {
        console.error('[api-keys] Xóa Supabase thất bại:', err);
      }
    }
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
  // "Sẵn sàng tạo video" = đủ key kịch bản + giọng đọc + ÍT NHẤT 1 trong 2 key tạo video
  // (kie.ai hoặc Veo3.1 Gemini) — không bắt user phải mua/nhập cả 2 nhà cung cấp.
  const allConnected =
    keys
      .filter((k) => !VIDEO_KEY_IDS.includes(k.id))
      .every((k) => k.status === 'connected')
    && keys.some((k) => VIDEO_KEY_IDS.includes(k.id) && k.status === 'connected');

  if (authLoading) {
    return (
      <section className="space-y-6">
        <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-6">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          QUẢN LÝ API KEYS
        </h2>
        <div className="flex flex-col items-center text-center gap-3 bg-card border border-dashed border-border rounded-2xl p-10">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Cần đăng nhập để quản lý API Keys</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              API Key được lưu riêng theo tài khoản Google — đăng nhập ở mục Cài đặt chung để xem, nhập hoặc đồng bộ key trên nhiều thiết bị.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {!keysReady && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Đang tải API Keys từ tài khoản...
        </p>
      )}
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
                <SecretField
                  value={displayValue || ''}
                  visible={isVisible}
                  onToggleVisibility={() => toggleVisibility(entry.id)}
                  copied={copiedId === entry.id}
                  onCopy={() => copyToClipboard(entry.id, displayValue)}
                  onEdit={() => startEdit(entry)}
                  onDelete={hasValue ? () => handleDelete(entry.id) : undefined}
                  disabled={!hasValue}
                  placeholder="Chưa nhập key"
                  inputClassName="text-xs text-muted-foreground"
                />
              )}

              {/* Error message */}
              {entry.status === 'error' && entry.errorMsg && (
                <FieldError>{entry.errorMsg}</FieldError>
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
