import { VeoApiError, isFatalVeoMessage } from './veo-errors';

/** kie.ai trả JSON dạng {code,msg,data} — khác hẳn Google {error:{message}} */
export interface KieApiResponse<T> {
  code?: number;
  msg?: string;
  data?: T;
}

/** Đọc JSON an toàn — kie.ai đôi khi trả HTML (404/502) thay vì JSON */
export async function readKieJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new VeoApiError(`${label}: phản hồi trống (${res.status}).`, { status: res.status });
  }
  if (trimmed.startsWith('<')) {
    throw new VeoApiError(
      `${label}: server trả HTML thay vì JSON (${res.status}) — kiểm tra API / endpoint.`,
      { status: res.status },
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new VeoApiError(
      `${label}: không parse được JSON (${res.status}): ${trimmed.slice(0, 120)}`,
      { status: res.status },
    );
  }
}

/** Chuẩn hoá lỗi kie.ai ({code,msg}) thành VeoApiError — dùng chung cho kie.service.ts và veo.service.ts */
export function parseKieError(msg: string | undefined, status: number, fallback: string): VeoApiError {
  const message = msg ?? fallback;
  return new VeoApiError(message, { status, fatal: isFatalVeoMessage(message) || status === 401 });
}
