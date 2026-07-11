const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callLicenseApi<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/license/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Không kết nối được backend (${API_BASE}). Hãy chạy npm run dev:be.`);
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !json?.success) {
    throw new Error(json?.error ?? `License API lỗi (${res.status})`);
  }
  return json.data as T;
}

class LicenseService {
  /** Gọi sau khi đăng nhập — server tự bỏ qua nếu đã gửi email trước đó */
  issue(accessToken: string) {
    return callLicenseApi<{ sent: boolean; alreadyIssued?: boolean }>('issue', accessToken);
  }

  /** Người dùng chủ động bấm "Gửi lại License Key" trong Cài đặt */
  resend(accessToken: string) {
    return callLicenseApi<{ sent: boolean }>('resend', accessToken);
  }

  /** Kiểm tra license key nhập vào có khớp UID đang đăng nhập không */
  verify(accessToken: string, licenseKey: string) {
    return callLicenseApi<{ valid: boolean }>('verify', accessToken, { licenseKey });
  }
}

export const licenseService = new LicenseService();
