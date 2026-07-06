import type { PresetInput, PresetTimelineDemo } from '@/lib/preset-scripts';
import type { VideoScene } from '@/lib/scenes';
import type { TtsInput, VeoInput } from '@/lib/pipeline-payload';
import type { SavedCharacter } from '@/lib/saved-characters';
import { createEmptyCharacter } from '@/lib/saved-characters';
import type { VideoSettings } from '@/contexts/project-settings-context';
import { DEFAULT_VIDEO_SETTINGS } from '@/contexts/project-settings-context';

export type BulkProjectStatus = 'draft' | 'analyzing' | 'generating' | 'completed' | 'error';

export type BulkStatusFilter = 'all' | 'running' | 'completed' | 'draft';
export type BulkSortOrder = 'newest' | 'oldest';

export interface CreateBulkOptions {
  title: string;
  settings: VideoSettings;
}

export interface VideoBulkProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: BulkProjectStatus;
  veoModelLabel: string;
  aspectRatio: string;
  scenesDone: number;
  scenesTotal: number;
  scenes: VideoScene[];
  ttsInput: TtsInput | null;
  veoInput: VeoInput | null;
  settings: VideoSettings;
  /** Prompt / nội dung mục 2 — riêng từng bulk */
  inputContent: string;
  /** Nhân vật mục 1 — riêng từng bulk */
  characters: SavedCharacter[];
  appliedInput: PresetInput | null;
  timelineDemo: PresetTimelineDemo | null;
  pendingTimelineDemo: PresetTimelineDemo | null;
  timelineFocusSceneId: string | null;
}

export function generateBulkProjectId(): string {
  return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatBulkTitle(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const d = date.getDate();
  const mo = date.getMonth() + 1;
  const y = date.getFullYear();
  return `Bulk_video_${h}:${m} ${d}-${mo}-${y}`;
}

export function formatBulkCardDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function resolveVeoModelLabel(veoInput: VeoInput | null, settings: VideoSettings): string {
  const model = veoInput?.veoModel?.trim() || settings.veoModel?.trim();
  if (model) {
    const short = model.split('/').pop() ?? model;
    return short.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const q = veoInput?.videoQuality ?? settings.videoQuality ?? '720p';
  return `Veo 3 · ${q}`;
}

export function countScenesDone(scenes: VideoScene[]): number {
  return scenes.filter((s) => s.status === 'success' || s.status === 'error').length;
}

export function createBulkProject(
  options: CreateBulkOptions | VideoSettings = DEFAULT_VIDEO_SETTINGS,
  legacyTitle?: string,
): VideoBulkProject {
  const title = typeof options === 'object' && 'title' in options
    ? options.title.trim()
    : legacyTitle ?? formatBulkTitle();
  const settings = typeof options === 'object' && 'settings' in options
    ? { ...options.settings }
    : { ...(options as VideoSettings) };

  const now = new Date().toISOString();
  return {
    id: generateBulkProjectId(),
    title: title || formatBulkTitle(),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    veoModelLabel: resolveVeoModelLabel(null, settings),
    aspectRatio: settings.aspectRatio,
    scenesDone: 0,
    scenesTotal: 0,
    scenes: [],
    ttsInput: null,
    veoInput: null,
    settings,
    inputContent: '',
    characters: [createEmptyCharacter()],
    appliedInput: null,
    timelineDemo: null,
    pendingTimelineDemo: null,
    timelineFocusSceneId: null,
  };
}

export function filterBulkProjects(
  projects: VideoBulkProject[],
  query: string,
  statusFilter: BulkStatusFilter,
  sort: BulkSortOrder,
): VideoBulkProject[] {
  let list = [...projects];

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => p.title.toLowerCase().includes(q));
  }

  if (statusFilter === 'running') {
    list = list.filter((p) => p.status === 'generating' || p.status === 'analyzing');
  } else if (statusFilter === 'completed') {
    list = list.filter((p) => p.status === 'completed');
  } else if (statusFilter === 'draft') {
    list = list.filter((p) => p.status === 'draft' || p.status === 'error');
  }

  list.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sort === 'newest' ? tb - ta : ta - tb;
  });

  return list;
}

export function bulkProgressPercent(project: VideoBulkProject): number {
  if (project.scenesTotal <= 0) {
    if (project.status === 'completed') return 100;
    if (project.status === 'generating') return 5;
    return 0;
  }
  return Math.round((project.scenesDone / project.scenesTotal) * 100);
}
