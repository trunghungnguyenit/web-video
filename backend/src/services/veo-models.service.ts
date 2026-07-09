const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface VeoModelInfo {
  id: string;
  displayName: string;
  description?: string;
}

interface GoogleModel {
  name?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

interface ListModelsResponse {
  models?: GoogleModel[];
  error?: { message?: string };
}

function modelIdFromName(name: string): string {
  return name.replace(/^models\//, '');
}

function formatModelLabel(id: string): string {
  return id
    .replace(/^veo-/, 'Veo ')
    .replace(/-generate-/g, ' ')
    .replace(/-preview$/g, ' (Preview)')
    .replace(/-001$/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isVeoVideoModel(model: GoogleModel): boolean {
  const id = model.name ? modelIdFromName(model.name) : '';
  if (!id.startsWith('veo-')) return false;

  const methods = model.supportedGenerationMethods ?? [];
  if (methods.length === 0) return true;
  return methods.some((m) =>
    m.includes('predictLongRunning') || m.includes('generateVideo') || m.includes('generate'),
  );
}

export async function listVeoModels(apiKey: string): Promise<VeoModelInfo[]> {
  const key = apiKey.trim();
  if (!key) throw new Error('Thiếu API Key.');

  const res = await fetch(`${BASE_URL}/models?pageSize=1000`, {
    headers: { 'X-goog-api-key': key },
  });
  const data = (await res.json()) as ListModelsResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Không lấy được danh sách model (${res.status}).`);
  }

  const models = (data.models ?? [])
    .filter(isVeoVideoModel)
    .map((m) => {
      const id = modelIdFromName(m.name!);
      return {
        id,
        displayName: m.displayName?.trim() || formatModelLabel(id),
        description: m.description?.trim(),
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));

  if (models.length === 0) {    throw new Error('Key hợp lệ nhưng không có model Veo — kiểm tra quyền Veo 3 trên tài khoản Google AI.');
  }

  return models;
 
}
