'use client';

import { useState } from 'react';
import {
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  Copy, Trash2, Pencil, Plus, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── License ─────────────────────────────────────────────────────────────────

type LicenseStatus = 'idle' | 'checking' | 'valid' | 'invalid';
const LICENSE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function validateLicenseFormat(raw: string): string | null {
  if (!raw.trim()) return 'Vui lòng nhập license key.';
  if (raw.trim().length < 19) return 'Key chưa đủ độ dài — định dạng: XXXX-XXXX-XXXX-XXXX.';
  if (!LICENSE_PATTERN.test(raw.trim().toUpperCase())) {
    return 'Sai định dạng. Key gồm 4 nhóm ký tự chữ/số, cách nhau bằng dấu "-" (VD: AB1C-2DEF-GH3I-4JKL).';
  }
  return null;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

type KeyStatus = 'idle' | 'verifying' | 'valid' | 'error';

interface ApiKey {
  id: 'gemini' | 'veo' | 'tts';
  name: string;
  role: string;
  placeholder: string;
  docsUrl: string;
  prefixHint: string;   // expected prefix untuk validasi awal
  minLength: number;
}

const API_KEYS_CONFIG: ApiKey[] = [
  {
    id: 'gemini',
    name: 'Gemini API Key',
    role: 'Tạo kịch bản · phân cảnh · lời thoại',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    prefixHint: 'AIza',
    minLength: 20,
  },
  {
    id: 'veo',
    name: 'Veo API Key',
    role: 'Tạo video từng cảnh · tỷ lệ · độ phân giải',
    placeholder: 'veo-...',
    docsUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos',
    prefixHint: 'veo-',
    minLength: 10,
  },
  {
    id: 'tts',
    name: 'ElevenLabs API Key',
    role: 'Tạo giọng đọc · giọng nam/nữ · đa ngôn ngữ',
    placeholder: 'sk_...',
    docsUrl: 'https://elevenlabs.io/app/settings/api-keys',
    prefixHint: 'sk_',
    minLength: 20,
  },
];

interface ApiKeyState {
  value: string;
  draft: string;
  status: KeyStatus;
  error: string;
  editing: boolean;
  visible: boolean;
  copied: boolean;
}

function validateApiKey(cfg: ApiKey, value: string): string | null {
  const v = value.trim();
  if (!v) return `Vui lòng nhập ${cfg.name}.`;
  if (v.length < cfg.minLength) return `Key quá ngắn (tối thiểu ${cfg.minLength} ký tự).`;
  if (cfg.prefixHint && !v.startsWith(cfg.prefixHint)) {
    return `Key không đúng định dạng — phải bắt đầu bằng "${cfg.prefixHint}".`;
  }
  return null;
}

async function simulateVerify(id: string, value: string): Promise<{ ok: boolean; serverMsg?: string }> {
  await new Promise((r) => setTimeout(r, 1100));
  // Simulate: key bắt đầu bằng "FAIL" thì server trả về lỗi
  if (value.toLowerCase().includes('fail')) {
    return { ok: false, serverMsg: 'Server từ chối key — quota vượt giới hạn hoặc key bị thu hồi.' };
  }
  return { ok: true };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeySetupSettings() {
  // License state
  const [licenseKey, setLicenseKey] = useState('3L4Y-TXRH-J540-TQRF');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('valid');
  const [licenseError, setLicenseError] = useState('');

  // API keys state — keyed by id
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyState>>(() =>
    Object.fromEntries(
      API_KEYS_CONFIG.map((cfg) => [
        cfg.id,
        { value: '', draft: '', status: 'idle' as KeyStatus, error: '', editing: false, visible: false, copied: false },
      ]),
    ),
  );

  // ── License handlers ──────────────────────────────────────────────────────

  const handleLicenseChange = (raw: string) => {
    // Auto-format: insert dash every 4 chars
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formatted = clean.match(/.{1,4}/g)?.join('-') ?? clean;
    setLicenseKey(formatted.slice(0, 19));
    setLicenseStatus('idle');
    setLicenseError('');
  };

  const handleLicenseCheck = async () => {
    const err = validateLicenseFormat(licenseKey);
    if (err) { setLicenseError(err); setLicenseStatus('invalid'); return; }
    setLicenseError('');
    setLicenseStatus('checking');
    await new Promise((r) => setTimeout(r, 900));
    // Simulate: key chứa "FAIL" thì invalid
    if (licenseKey.includes('FAIL')) {
      setLicenseStatus('invalid');
      setLicenseError('Key không hợp lệ — vui lòng kiểm tra lại hoặc liên hệ hỗ trợ.');
    } else {
      setLicenseStatus('valid');
    }
  };

  // ── API key handlers ──────────────────────────────────────────────────────

  const patch = (id: string, delta: Partial<ApiKeyState>) =>
    setApiKeys((prev) => ({ ...prev, [id]: { ...prev[id], ...delta } }));

  const startEdit = (id: string) =>
    patch(id, { editing: true, draft: apiKeys[id].value, error: '' });

  const cancelEdit = (id: string) =>
    patch(id, { editing: false, draft: '', error: '' });

  const handleApiSave = async (cfg: ApiKey) => {
    const { draft } = apiKeys[cfg.id];
    const localErr = validateApiKey(cfg, draft);
    if (localErr) { patch(cfg.id, { error: localErr }); return; }
    patch(cfg.id, { status: 'verifying', error: '' });
    const result = await simulateVerify(cfg.id, draft);
    if (result.ok) {
      patch(cfg.id, { value: draft, status: 'valid', editing: false, draft: '' });
    } else {
      patch(cfg.id, { status: 'error', error: result.serverMsg ?? 'Xác thực thất bại.' });
    }
  };

  const handleApiDelete = (id: string) =>
    patch(id, { value: '', status: 'idle', error: '', editing: false, draft: '', visible: false });

  const handleCopy = (id: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    patch(id, { copied: true });
    setTimeout(() => patch(id, { copied: false }), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const connectedCount = API_KEYS_CONFIG.filter((c) => apiKeys[c.id].status === 'valid').length;

  return (
    <div className="space-y-5">

      {/* ── Section: License Key ─────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-foreground">License Key</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Kích hoạt đầy đủ tính năng của ứng dụng</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">License Key</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => handleLicenseChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLicenseCheck()}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                maxLength={19}
                spellCheck={false}
                className={cn(
                  'w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-1 transition-colors pr-8',
                  licenseError
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/25'
                    : licenseStatus === 'valid'
                      ? 'border-green-500/50 focus:border-green-500/50 focus:ring-green-500/20'
                      : 'border-border focus:border-primary/50 focus:ring-primary/20',
                )}
              />
              {licenseStatus === 'valid' && (
                <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400 pointer-events-none" />
              )}
              {(licenseStatus === 'invalid' || licenseError) && (
                <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive pointer-events-none" />
              )}
            </div>
            <button
              type="button"
              onClick={handleLicenseCheck}
              disabled={licenseStatus === 'checking'}
              className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {licenseStatus === 'checking' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Kiểm tra...</>
              ) : 'Kiểm tra'}
            </button>
          </div>

          {/* Feedback messages */}
          {licenseError && (
            <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {licenseError}
            </p>
          )}
          {!licenseError && licenseStatus === 'valid' && (
            <p className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Key hợp lệ — đã kích hoạt đầy đủ tính năng
            </p>
          )}
          {!licenseError && licenseStatus === 'invalid' && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Key không hợp lệ — kiểm tra lại hoặc liên hệ support
            </p>
          )}
        </div>
      </div>

      {/* ── Section: API Keys ────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-foreground">API Keys</h4>
          </div>
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0',
            connectedCount === API_KEYS_CONFIG.length
              ? 'text-green-400 bg-green-500/10 border-green-500/30'
              : 'text-muted-foreground bg-muted/10 border-muted/30',
          )}>
            {connectedCount}/{API_KEYS_CONFIG.length} kết nối
          </span>
        </div>

        {/* Key cards */}
        <div className="space-y-3">
          {API_KEYS_CONFIG.map((cfg) => {
            const ks = apiKeys[cfg.id];
            const hasValue = !!ks.value;

            return (
              <div
                key={cfg.id}
                className={cn(
                  'rounded-xl border p-4 space-y-3 transition-colors',
                  ks.status === 'error'
                    ? 'bg-destructive/5 border-destructive/30'
                    : ks.status === 'valid'
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-background/50 border-border',
                )}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{cfg.name}</p>
                    <p className="text-[11px] text-muted-foreground">{cfg.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Status badge */}
                    {ks.status === 'valid' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />Hợp lệ
                      </span>
                    )}
                    {ks.status === 'verifying' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-md">
                        <Loader2 className="w-3 h-3 animate-spin" />Xác thực...
                      </span>
                    )}
                    {ks.status === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/25 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3 h-3" />Lỗi
                      </span>
                    )}
                    {(ks.status === 'idle') && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/20 border border-muted/30 px-2 py-0.5 rounded-md">
                        <AlertCircle className="w-3 h-3" />Chưa nhập
                      </span>
                    )}
                    {/* Docs link */}
                    <a
                      href={cfg.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Xem hướng dẫn lấy key"
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Edit mode */}
                {ks.editing ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={ks.visible ? 'text' : 'password'}
                        value={ks.draft}
                        onChange={(e) => patch(cfg.id, { draft: e.target.value, error: '' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApiSave(cfg);
                          if (e.key === 'Escape') cancelEdit(cfg.id);
                        }}
                        placeholder={cfg.placeholder}
                        autoFocus
                        spellCheck={false}
                        className={cn(
                          'w-full px-3 py-2 pr-10 bg-background border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 transition-colors',
                          ks.error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/25'
                            : 'border-primary/40 focus:border-primary/60 focus:ring-primary/20',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => patch(cfg.id, { visible: !ks.visible })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {ks.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Inline validation error */}
                    {ks.error && (
                      <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {ks.error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApiSave(cfg)}
                        disabled={ks.status === 'verifying'}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ks.status === 'verifying' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xác thực...</>
                        ) : 'Lưu & xác thực'}
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEdit(cfg.id)}
                        disabled={ks.status === 'verifying'}
                        className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground text-xs rounded-lg transition-colors disabled:opacity-40"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-2">
                    <input
                      type={ks.visible ? 'text' : 'password'}
                      value={ks.value}
                      readOnly
                      placeholder="Chưa nhập key"
                      className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-muted-foreground cursor-default"
                    />
                    <button
                      type="button"
                      onClick={() => patch(cfg.id, { visible: !ks.visible })}
                      disabled={!hasValue}
                      title={ks.visible ? 'Ẩn key' : 'Hiện key'}
                      className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {ks.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(cfg.id, ks.value)}
                      disabled={!hasValue}
                      title="Sao chép key"
                      className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {ks.copied
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <Copy className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(cfg.id)}
                      title="Chỉnh sửa key"
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary flex-shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {hasValue && (
                      <button
                        type="button"
                        onClick={() => handleApiDelete(cfg.id)}
                        title="Xóa key"
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Server error on view mode */}
                {!ks.editing && ks.status === 'error' && ks.error && (
                  <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {ks.error}
                  </p>
                )}

                {/* CTA when not yet entered */}
                {!ks.editing && ks.status === 'idle' && !hasValue && (
                  <button
                    type="button"
                    onClick={() => startEdit(cfg.id)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nhập {cfg.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <p className="text-xs text-muted-foreground">Keys mã hóa server-side · Không lưu ở client</p>
          {connectedCount === API_KEYS_CONFIG.length && (
            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sẵn sàng tạo video
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
