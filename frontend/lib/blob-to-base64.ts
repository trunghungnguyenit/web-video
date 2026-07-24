// ─── Tải bytes thật từ 1 URL → base64 thuần + mimeType ──────────────────────
// Dùng khi chỉ còn URL đã lưu (kie.ai, Supabase Storage...) chứ không còn File/Blob gốc
// trong bộ nhớ — vd ảnh tham chiếu nhân vật/Master Cast lưu URL (không phải base64).

function blobToBase64(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') { reject(new Error('Không đọc được dữ liệu.')); return; }
      const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if (!match) { reject(new Error('Không đọc được dữ liệu.')); return; }
      resolve({ mimeType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error('Không đọc được dữ liệu.'));
    reader.readAsDataURL(blob);
  });
}

/** Tải URL → base64 — trả `undefined` (không throw) nếu lỗi, để caller tự quyết định fallback */
export async function fetchUrlAsBase64(url: string): Promise<{ base64: string; mimeType: string } | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    return await blobToBase64(await res.blob());
  } catch {
    return undefined;
  }
}
