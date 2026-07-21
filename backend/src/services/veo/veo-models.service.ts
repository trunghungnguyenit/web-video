/** Danh sách model Veo 3.1 qua kie.ai — kie.ai không có endpoint discovery như Google, nên trả cứng 3 model */

export interface VeoModelInfo {
  id: string;
  displayName: string;
  description?: string;
}

const STATIC_VEO_MODELS: VeoModelInfo[] = [
  { id: 'veo3', displayName: 'Veo 3.1 Quality', description: 'Chất lượng cao nhất, không hỗ trợ Master Cast reference' },
  { id: 'veo3_fast', displayName: 'Veo 3.1 Fast', description: 'Cân bằng tốc độ/chi phí, hỗ trợ Master Cast reference' },
  { id: 'veo3_lite', displayName: 'Veo 3.1 Lite', description: 'Rẻ nhất, phù hợp khối lượng lớn' },
];

export async function listVeoModels(apiKey: string): Promise<VeoModelInfo[]> {
  const key = apiKey.trim();
  if (!key) throw new Error('Thiếu API Key.');

  return STATIC_VEO_MODELS;
}
