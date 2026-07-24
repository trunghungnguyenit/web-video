// ─── Upload ảnh Master Cast / avatar nhân vật lên kie.ai → URL bền vững ─────
// Dùng chung cho MasterCastPanel (tab link) và CharacterMaster (tab text) — trước đây
// mỗi nơi tự đọc file thành base64 rồi lưu thẳng vào localStorage (mất khi F5 với user
// đăng nhập vì avatarDataUrl/masterCastImageDataUrl không đồng bộ Supabase). Giờ upload
// lên kie.ai lấy URL công khai — chỉ URL (chuỗi ngắn) mới lưu vào state/Supabase.

import { getApiKey, API_KEY_IDS } from '@/lib/api-keys/api-keys-store';
import { parseDataUrl } from '@/lib/pipeline-payload';
import { veoService } from '@/services/veo/veo.service';

const MAX_REFERENCE_IMAGE_MB = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Không đọc được file ảnh.'));
    };
    reader.onerror = () => reject(new Error('Không đọc được file ảnh — thử lại.'));
    reader.readAsDataURL(file);
  });
}

/** Validate loại/dung lượng file ảnh — dùng trước khi đọc/upload */
export function validateReferenceImageFile(file: File): string | undefined {
  if (!file.type.startsWith('image/')) {
    return 'File phải là hình ảnh (JPG, PNG, WebP...).';
  }
  if (file.size > MAX_REFERENCE_IMAGE_MB * 1024 * 1024) {
    return `Ảnh quá lớn — tối đa ${MAX_REFERENCE_IMAGE_MB}MB.`;
  }
  return undefined;
}

/** Đọc file ảnh → upload lên kie.ai (file-base64-upload) → trả URL công khai */
export async function uploadReferenceImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Không đọc được dữ liệu ảnh.');

  const apiKey = getApiKey(API_KEY_IDS.kie).trim();
  if (!apiKey) {
    throw new Error('Thiếu Kie API Key — nhập tại mục API Keys để upload ảnh tham chiếu.');
  }

  return veoService.uploadImage({
    apiKey,
    base64: parsed.base64,
    mimeType: parsed.mimeType,
  });
}
