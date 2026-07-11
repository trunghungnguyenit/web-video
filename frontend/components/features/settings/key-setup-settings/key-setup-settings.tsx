'use client';

import { useState, useEffect } from 'react';
import {
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  Copy, Trash2, Pencil, Plus, ExternalLink, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { licenseService } from '@/services/license.service';
import { toUserMessage } from '@/lib/error-messages';
import { getSavedLicenseKey, saveLicenseKey, clearSavedLicenseKey } from '@/lib/license-store';

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
  const { user, accessToken } = useAuth();

  // License state
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('idle');
  const [licenseError, setLicenseError] = useState('');
  const [licenseVisible, setLicenseVisible] = useState(false);
  const [licenseCopied, setLicenseCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Khôi phục key đã lưu (localStorage) khi có tài khoản — verify lại với Supabase
  // để bắt kịp trường hợp admin đổi/thu hồi key thủ công trong bảng license_issued.
  useEffect(() => {
    if (!user || !accessToken) return;
    const saved = getSavedLicenseKey(user.id);
    if (!saved) return;

    setLicenseKey(saved);
    setLicenseStatus('checking');
    licenseService.verify(accessToken, saved)
      .then(({ valid }) => {
        setLicenseStatus(valid ? 'valid' : 'invalid');
        if (!valid) {
          setLicenseError('Key đã lưu không còn hợp lệ — key có thể đã bị đổi, hãy kiểm tra lại.');
          clearSavedLicenseKey();
        }
      })
      .catch(() => {
        // Mất kết nối backend — giữ nguyên key đã lưu trên input, không đổi trạng thái
        // để tránh báo lỗi giả khi chỉ là do mạng.
        setLicenseStatus('idle');
      });
  }, [user, accessToken]);

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
    if (!user || !accessToken) {
      setLicenseError('Vui lòng đăng nhập bằng Google (mục Cài đặt chung) trước khi kiểm tra License Key.');
      setLicenseStatus('invalid');
      return;
    }
    setLicenseError('');
    setLicenseStatus('checking');
    try {
      const { valid } = await licenseService.verify(accessToken, licenseKey);
      setLicenseStatus(valid ? 'valid' : 'invalid');
      if (valid) {
        saveLicenseKey(user.id, licenseKey);
        setLicenseVisible(false);
      } else {
        setLicenseError('Key không hợp lệ — key này không khớp với tài khoản Google đang đăng nhập.');
      }
    } catch (err) {
      setLicenseStatus('invalid');
      setLicenseError(toUserMessage(err, 'Không kiểm tra được License Key — thử lại.'));
    }
  };

  /** Quay lại chế độ nhập để dán key khác — không xóa key đã lưu cho tới khi Kiểm tra lại thành công */
  const handleLicenseEdit = () => {
    setLicenseStatus('idle');
    setLicenseError('');
    setLicenseVisible(true);
  };

  const handleLicenseClear = () => {
    setLicenseKey('');
    setLicenseStatus('idle');
    setLicenseError('');
    setLicenseVisible(false);
    clearSavedLicenseKey();
  };

  const handleLicenseCopy = () => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setLicenseCopied(true);
    setTimeout(() => setLicenseCopied(false), 2000);
  };

  const handleResendLicense = async () => {
    if (!user || !accessToken) return;
    setResending(true);
    setResendMessage('');
    try {
      await licenseService.resend(accessToken);
      setResendMessage(`Đã gửi License Key tới ${user.email}`);
    } catch (err) {
      setResendMessage(toUserMessage(err, 'Gửi License Key thất bại — thử lại sau.'));
    } finally {
      setResending(false);
      setTimeout(() => setResendMessage(''), 5000);
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

        {!user && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-orange-500/30 bg-orange-500/5">
            <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Đăng nhập bằng Google ở mục <strong className="text-foreground">Cài đặt chung</strong> để nhận License Key qua email và kích hoạt.
            </p>
          </div>
        )}

        {user && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-border bg-background/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              License Key gắn với tài khoản <strong className="text-foreground">{user.email}</strong> — đã được gửi qua email khi đăng nhập lần đầu.
            </p>
            <button
              type="button"
              onClick={handleResendLicense}
              disabled={resending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Gửi lại qua email
            </button>
          </div>
        )}
        {resendMessage && (
          <p className="text-xs text-muted-foreground -mt-2">{resendMessage}</p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">License Key</label>

          {licenseStatus === 'valid' ? (
            /* ── Chế độ xem — key đã kích hoạt, ẩn/hiện giống mục Quản lý API Keys ── */
            <div className="flex items-center gap-2">
              <input
                type={licenseVisible ? 'text' : 'password'}
                value={licenseKey}
                readOnly
                className="flex-1 px-3 py-2 bg-background border border-green-500/50 rounded-lg text-sm text-foreground font-mono cursor-default"
              />
              <button
                type="button"
                onClick={() => setLicenseVisible((v) => !v)}
                title={licenseVisible ? 'Ẩn key' : 'Hiện key'}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                {licenseVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleLicenseCopy}
                title="Copy key"
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {licenseCopied
                  ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                  : <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />}
              </button>
              <button
                type="button"
                onClick={handleLicenseEdit}
                title="Nhập key khác"
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-muted-foreground hover:text-primary"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLicenseClear}
                title="Xóa key"
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ── Chế độ nhập — chưa kích hoạt / đang kiểm tra / key sai ── */
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
                  autoFocus={licenseVisible}
                  className={cn(
                    'w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-1 transition-colors pr-8',
                    licenseError
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/25'
                      : 'border-border focus:border-primary/50 focus:ring-primary/20',
                  )}
                />
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
          )}

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
    </div>
  );
}
