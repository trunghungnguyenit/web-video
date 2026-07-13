'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldError } from '@/components/ui/field-error';
import { SecretField } from '@/components/ui/secret-field';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useAuth } from '@/contexts/auth-context';
import { licenseService } from '@/services/license.service';
import { toUserMessage } from '@/lib/error-messages';
import { saveLicenseKey, clearSavedLicenseKey, getSavedLicenseKey } from '@/lib/license-store';

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

// ─── Component ────────────────────────────────────────────────────────────────

export function KeySetupSettings() {
  const { user, accessToken } = useAuth();

  // License state
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('idle');
  const [licenseError, setLicenseError] = useState('');
  const [licenseVisible, setLicenseVisible] = useState(false);
  const { copiedId, copy: copyToClipboard } = useCopyToClipboard();
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
            <SecretField
              value={licenseKey}
              visible={licenseVisible}
              onToggleVisibility={() => setLicenseVisible((v) => !v)}
              copied={copiedId === 'license'}
              onCopy={() => copyToClipboard('license', licenseKey)}
              onEdit={handleLicenseEdit}
              editTitle="Nhập key khác"
              onDelete={handleLicenseClear}
              inputClassName="border-green-500/50"
            />
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
          {licenseError && <FieldError>{licenseError}</FieldError>}
          {!licenseError && licenseStatus === 'valid' && (
            <p className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Key hợp lệ — đã kích hoạt đầy đủ tính năng
            </p>
          )}
          {!licenseError && licenseStatus === 'invalid' && (
            <FieldError className="items-center">Key không hợp lệ — kiểm tra lại hoặc liên hệ support</FieldError>
          )}
        </div>
      </div>
    </div>
  );
}
