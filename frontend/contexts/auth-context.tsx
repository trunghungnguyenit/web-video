'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/error-messages';
import { licenseService } from '@/services/license.service';
import { clearAllApiKeys } from '@/lib/api-keys-store';

interface AuthContextValue {
  user: User | null;
  /** Supabase access token — dùng gọi API backend cần xác thực (License...) */
  accessToken: string | null;
  loading: boolean;
  signInError: string | null;
  signingIn: boolean;
  signingOut: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearSignInError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabaseRef = useRef(createClient());
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [justSignedIn, setJustSignedIn] = useState(false);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Google redirect thẳng về `/` kèm `?code=...` — browser client tự đổi code lấy
    // session (detectSessionInUrl, bật mặc định) vì cùng 1 context tạo verifier lúc
    // gọi signInWithOAuth, không cần route server riêng (tránh lệch cookie client/server).
    const hadOAuthCode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('code');

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAccessToken(data.session?.access_token ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
      setLoading(false);
      setSigningIn(false);
      if (event === 'SIGNED_IN' && hadOAuthCode) {
        setJustSignedIn(true);
        setTimeout(() => setJustSignedIn(false), 4000);
      }
      // Tự động phát License Key qua email — backend tự bỏ qua nếu đã gửi trước đó
      // (bảng license_issued), nên gọi lại mỗi lần SIGNED_IN cũng an toàn, không spam.
      if (event === 'SIGNED_IN' && session?.access_token) {
        void licenseService.issue(session.access_token).catch(() => {});
      }
    });

    // Nếu sau vài giây URL vẫn còn `?code=` (đổi session thất bại/không xảy ra) —
    // báo lỗi rõ ràng thay vì im lặng, đồng thời dọn URL cho sạch.
    let failTimer: ReturnType<typeof setTimeout> | undefined;
    if (hadOAuthCode) {
      failTimer = setTimeout(() => {
        if (new URLSearchParams(window.location.search).has('code')) {
          setSignInError('Đăng nhập Google thất bại — thử lại.');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 2500);
    }

    return () => {
      subscription.subscription.unsubscribe();
      if (failTimer) clearTimeout(failTimer);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setSignInError(null);
    if (!supabaseRef.current) {
      setSignInError('Đăng nhập Google chưa được cấu hình — thiếu NEXT_PUBLIC_SUPABASE_URL/ANON_KEY trong .env.local.');
      return;
    }
    setSigningIn(true);
    try {
      const { error } = await supabaseRef.current.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        setSignInError(toUserMessage(error, 'Đăng nhập Google thất bại — thử lại.'));
        setSigningIn(false);
      }
      // Thành công → trình duyệt redirect sang Google, signingIn không cần reset ở đây
    } catch (err) {
      setSignInError(toUserMessage(err, 'Đăng nhập Google thất bại — thử lại.'));
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseRef.current) return;
    setSigningOut(true);
    try {
      const { error } = await supabaseRef.current.auth.signOut();
      if (error) {
        setSignInError(toUserMessage(error, 'Đăng xuất thất bại — thử lại.'));
      } else {
        // Xóa API key của tài khoản vừa thoát khỏi localStorage — chạy ở đây
        // (không phải trong component riêng) để luôn có hiệu lực bất kể đang
        // mở trang nào, tránh rò rỉ key sang phiên đăng nhập sau.
        clearAllApiKeys();
      }
    } catch (err) {
      setSignInError(toUserMessage(err, 'Đăng xuất thất bại — thử lại.'));
    } finally {
      setSigningOut(false);
    }
  }, []);

  const clearSignInError = useCallback(() => setSignInError(null), []);

  const value = useMemo(
    () => ({ user, accessToken, loading, signInError, signingIn, signingOut, signInWithGoogle, signOut, clearSignInError }),
    [user, accessToken, loading, signInError, signingIn, signingOut, signInWithGoogle, signOut, clearSignInError],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {justSignedIn && user && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600/90 text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Đã đăng nhập bằng Google — {user.user_metadata?.full_name ?? user.email}
        </div>
      )}
      {signInError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-start gap-2 max-w-md px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{signInError}</span>
          <button type="button" onClick={clearSignInError} className="shrink-0 hover:opacity-70" aria-label="Đóng thông báo lỗi">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
