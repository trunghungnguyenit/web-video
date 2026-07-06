const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 30_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableGoogleError(message: string, status?: number): boolean {
  const m = message.toLowerCase();
  if (status === 429 || status === 503 || status === 500 || status === 502) return true;
  return (
    m.includes('high demand')
    || m.includes('try again')
    || m.includes('resource exhausted')
    || m.includes('resource_exhausted')
    || m.includes('overloaded')
    || m.includes('quota')
    || m.includes('rate limit')
    || m.includes('capacity')
  );
}

export function formatGoogleOverloadMessage(raw: string, service: string): string {
  if (isRetryableGoogleError(raw)) {
    return `${service}: Google API đang quá tải (${raw}). Hệ thống sẽ tự thử lại — nếu vẫn lỗi, hãy giảm số bulk chạy song song hoặc thử model Veo Fast / đợi vài phút.`;
  }
  return raw;
}

/** Retry khi Google trả high demand / 429 / 503 */
export async function withGoogleRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(message);

      const retryable = isRetryableGoogleError(message);
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
        if (retryable) {
          throw new Error(formatGoogleOverloadMessage(message, label));
        }
        throw lastError;
      }

      await sleep(RETRY_DELAYS_MS[attempt] ?? 5_000);
    }
  }

  throw lastError ?? new Error(`${label} thất bại.`);
}
