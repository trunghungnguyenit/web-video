/** Lỗi Veo — phân loại fatal (billing/quota) vs có thể retry */
export class VeoApiError extends Error {
  readonly status?: number;
  readonly fatal: boolean;

  constructor(message: string, options?: { status?: number; fatal?: boolean }) {
    super(message);
    this.name = 'VeoApiError';
    this.status = options?.status;
    this.fatal = options?.fatal ?? isFatalVeoMessage(message);
  }
}

// Dùng chung cho cả Veo và Kie.ai (kie.service.ts cũng import isFatalVeoMessage).
// Đồng bộ thủ công với frontend/lib/veo/fatal-error-patterns.ts khi đổi danh sách này.
const FATAL_PATTERNS = [
  /billing/i,
  /quota/i,
  /resource.?exhausted/i,
  /permission/i,
  /api.?key/i,
  /invalid.?key/i,
  /exceeded/i,
  /limit/i,
  /payment/i,
  /suspended/i,
  /disabled/i,
  /unauthorized/i,
];

/** Billing / Quota / key — dừng ngay, không retry */
export function isFatalVeoMessage(message: string): boolean {
  return FATAL_PATTERNS.some((re) => re.test(message));
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function withVeoRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const veoErr = err instanceof VeoApiError
      ? err
      : new VeoApiError(err instanceof Error ? err.message : `${label} thất bại`);

    if (veoErr.fatal) throw veoErr;

    try {
      return await fn();
    } catch (retryErr) {
      if (retryErr instanceof VeoApiError) throw retryErr;
      throw new VeoApiError(retryErr instanceof Error ? retryErr.message : `${label} thất bại (retry)`);
    }
  }
}
