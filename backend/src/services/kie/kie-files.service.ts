// ─── Kie File Upload — base64 → downloadUrl (dùng cho image_urls I2V) ────────

const UPLOAD_URL = 'https://api.kie.ai/api/file-base64-upload';

interface UploadResponse {
  success?: boolean;
  code?: number;
  msg?: string;
  data?: {
    downloadUrl?: string;
    fileName?: string;
    mimeType?: string;
  };
}

function extFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

/** Upload ảnh base64 lên Kie temp storage → URL công khai cho image_urls */
export async function uploadKieImageBase64(params: {
  apiKey: string;
  base64: string;
  mimeType: string;
  fileName?: string;
}): Promise<string> {
  const apiKey = params.apiKey.trim();
  if (!apiKey) throw new Error('Thiếu Kie.ai API Key để upload ảnh Master Cast.');

  const pure = params.base64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!pure) throw new Error('Ảnh Master Cast trống — không upload được.');

  const mime = params.mimeType.trim() || 'image/png';
  const dataUrl = `data:${mime};base64,${pure}`;
  const fileName = params.fileName?.trim() || `master-cast-${Date.now()}.${extFromMime(mime)}`;

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data: dataUrl,
      uploadPath: 'master-cast',
      fileName,
    }),
  });

  const data = (await res.json()) as UploadResponse;
  if (!res.ok || data.success === false || data.code !== 200 || !data.data?.downloadUrl) {
    throw new Error(data.msg ?? `Kie upload ảnh lỗi (${res.status})`);
  }

  return data.data.downloadUrl;
}
