// ─── Lưu metadata bulk (kịch bản, operation Veo…) — không lưu blob video ─────

import type { VideoBulkProject } from '@/lib/bulk-project';
import { createInitialBulkProject } from '@/lib/bulk-project';
import type { VideoScene } from '@/lib/scenes';

const STORAGE_KEY = 'web-video-bulk-projects-v1';

export interface BulkPersistSnapshot {
  projects: VideoBulkProject[];
  activeProjectId: string;
}

function stripBlobUrls(scenes: VideoScene[]): VideoScene[] {
  return scenes.map((s) => ({
    ...s,
    videoUrl: s.videoUrl?.startsWith('blob:') ? undefined : s.videoUrl,
    audioUrl: s.audioUrl?.startsWith('blob:') ? undefined : s.audioUrl,
  }));
}

function normalizeOnLoad(project: VideoBulkProject): VideoBulkProject {
  const scenes = project.scenes.map((s) => {
    let status = s.status;
    if (s.veoOperationName?.trim() && !s.videoUrl) {
      status = 'generating';
    } else if (status === 'generating') {
      status = s.videoUrl ? 'success' : 'error';
    }
    return { ...s, status };
  });

  let status = project.status;
  if (status === 'analyzing') status = 'draft';
  if (status === 'generating' && !scenes.some((s) => s.veoOperationName)) {
    const done = scenes.filter((s) => s.status === 'success').length;
    status = done === scenes.length && scenes.length > 0 ? 'completed' : 'error';
  }

  return {
    ...project,
    status,
    scenes,
    scenesDone: scenes.filter((s) => s.status === 'success' || s.status === 'error').length,
    scenesTotal: scenes.length,
    timelineFocusSceneId: null,
  };
}

export function loadBulkPersist(): BulkPersistSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BulkPersistSnapshot;
    if (!parsed.projects?.length) return null;
    const projects = parsed.projects.map(normalizeOnLoad);
    const activeProjectId = projects.some((p) => p.id === parsed.activeProjectId)
      ? parsed.activeProjectId
      : projects[0].id;
    return { projects, activeProjectId };
  } catch {
    return null;
  }
}

export function saveBulkPersist(projects: VideoBulkProject[], activeProjectId: string): void {
  if (typeof window === 'undefined') return;
  const snapshot: BulkPersistSnapshot = {
    projects: projects.map((p) => ({
      ...p,
      scenes: stripBlobUrls(p.scenes),
    })),
    activeProjectId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function defaultBulkPersist(): BulkPersistSnapshot {
  const initial = createInitialBulkProject();
  return { projects: [initial], activeProjectId: initial.id };
}
