'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { PresetInput, PresetTimelineDemo } from '@/lib/preset-scripts';
import type { SceneGenerationResult, VideoScene } from '@/lib/scenes';
import { scenesFromGeminiScript } from '@/lib/scenes';
import type { VideoSettings } from '@/contexts/project-settings-context';
import { DEFAULT_VIDEO_SETTINGS } from '@/contexts/project-settings-context';
import type { AnalyzePipelineRequest } from '@/lib/pipeline-payload';
import { runSceneGenerationQueue } from '@/lib/scene-generation-queue';
import { normalizeSceneDurationSetting } from '@/lib/saved-scripts';
import { geminiService } from '@/services/gemini.service';
import {
  countScenesDone,
  createBulkProject,
  createInitialBulkProject,
  formatBulkTitle,
  resolveVeoModelLabel,
  type CreateBulkOptions,
  type VideoBulkProject,
} from '@/lib/bulk-project';

interface BulkAnalyzeInput {
  pipeline: AnalyzePipelineRequest;
  sourceContent: string;
  sceneCount: string;
  videoType: string;
  language: string;
}

interface BulkProjectsContextValue {
  projects: VideoBulkProject[];
  activeProjectId: string;
  activeProject: VideoBulkProject;
  createProject: (options: CreateBulkOptions) => string;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
  deleteAllProjects: () => void;
  updateActiveProject: (patch: Partial<VideoBulkProject>) => void;
  setActiveScenes: Dispatch<SetStateAction<VideoScene[]>>;
  setActiveTimelineFocus: (sceneId: string | null) => void;
  applyPresetToActive: (input: PresetInput, timeline: PresetTimelineDemo | null) => void;
  syncSettingsForProject: (projectId: string, settings: VideoSettings) => void;
  startBulkAnalyze: (projectId: string, input: BulkAnalyzeInput) => void;
}

const BulkProjectsContext = createContext<BulkProjectsContextValue | null>(null);

function patchProject(
  projects: VideoBulkProject[],
  id: string,
  patch: Partial<VideoBulkProject> | ((p: VideoBulkProject) => Partial<VideoBulkProject>),
): VideoBulkProject[] {
  return projects.map((p) => {
    if (p.id !== id) return p;
    const delta = typeof patch === 'function' ? patch(p) : patch;
    return { ...p, ...delta, updatedAt: new Date().toISOString() };
  });
}

export function BulkProjectsProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => [createInitialBulkProject()], []);
  const [projects, setProjects] = useState<VideoBulkProject[]>(initial);
  const [activeProjectId, setActiveProjectId] = useState(initial[0].id);
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  /** Mỗi bulk có epoch riêng — tránh queue cũ ghi đè khi chạy lại */
  const generationEpochRef = useRef<Map<string, number>>(new Map());

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId],
  );

  const updateProject = useCallback((
    id: string,
    patch: Partial<VideoBulkProject> | ((p: VideoBulkProject) => Partial<VideoBulkProject>),
  ) => {
    setProjects((prev) => patchProject(prev, id, patch));
  }, []);

  const createProject = useCallback((options: CreateBulkOptions) => {
    const project = createBulkProject(options);
    setProjects((prev) => [project, ...prev]);
    setActiveProjectId(project.id);
    return project.id;
  }, []);

  const selectProject = useCallback((id: string) => {
    if (projectsRef.current.some((p) => p.id === id)) {
      setActiveProjectId(id);
    }
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        const fresh = createBulkProject({ title: formatBulkTitle(), settings: DEFAULT_VIDEO_SETTINGS });
        setActiveProjectId(fresh.id);
        return [fresh];
      }
      if (id === activeProjectId) {
        setActiveProjectId(next[0].id);
      }
      return next;
    });
  }, [activeProjectId]);

  const deleteAllProjects = useCallback(() => {
    const fresh = createBulkProject({ title: formatBulkTitle(), settings: DEFAULT_VIDEO_SETTINGS });
    setProjects([fresh]);
    setActiveProjectId(fresh.id);
  }, []);

  const updateActiveProject = useCallback((patch: Partial<VideoBulkProject>) => {
    updateProject(activeProjectId, patch);
  }, [activeProjectId, updateProject]);

  const setActiveScenes = useCallback((updater: SetStateAction<VideoScene[]>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const scenes = typeof updater === 'function' ? updater(p.scenes) : updater;
        return {
          ...p,
          scenes,
          scenesDone: countScenesDone(scenes),
          scenesTotal: scenes.length,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, [activeProjectId]);

  const setActiveTimelineFocus = useCallback((sceneId: string | null) => {
    updateProject(activeProjectId, { timelineFocusSceneId: sceneId });
  }, [activeProjectId, updateProject]);

  const applyPresetToActive = useCallback((input: PresetInput, timeline: PresetTimelineDemo | null) => {
    updateProject(activeProjectId, (p) => ({
      appliedInput: input,
      inputContent: input.content,
      settings: {
        ...p.settings,
        language: input.language,
        sceneCount: input.sceneCount,
        videoType: input.videoType,
        voice: input.voice,
        aspectRatio: input.aspectRatio ?? '16:9',
        sceneDuration: normalizeSceneDurationSetting(
          input.sceneDuration ?? '6',
          input.videoQuality ?? '720p',
        ),
        videoQuality: input.videoQuality ?? '720p',
        veoModel: input.veoModel ?? '',
        voiceSpeed: input.voiceSpeed ?? p.settings.voiceSpeed,
        sceneStyle: input.sceneStyleId ?? p.settings.sceneStyle,
      },
      aspectRatio: input.aspectRatio ?? '16:9',
      pendingTimelineDemo: timeline,
      timelineDemo: null,
      scenes: [],
      ttsInput: null,
      veoInput: null,
      scenesDone: 0,
      scenesTotal: 0,
      status: 'draft' as const,
    }));
  }, [activeProjectId, updateProject]);

  const syncSettingsForProject = useCallback((projectId: string, settings: VideoSettings) => {
    const project = projectsRef.current.find((p) => p.id === projectId);
    updateProject(projectId, {
      settings,
      aspectRatio: settings.aspectRatio,
      veoModelLabel: resolveVeoModelLabel(project?.veoInput ?? null, settings),
    });
  }, [updateProject]);

  const runSceneGeneration = useCallback((
    projectId: string,
    result: SceneGenerationResult,
    epoch: number,
  ) => {
    const pendingScenes = result.scenes.map((s) => ({ ...s, status: 'generating' as const }));

    updateProject(projectId, {
      status: 'generating',
      inputContent: result.sourceContent,
      ttsInput: result.ttsInput,
      veoInput: result.veoInput,
      scenes: pendingScenes,
      scenesDone: 0,
      scenesTotal: pendingScenes.length,
      veoModelLabel: resolveVeoModelLabel(result.veoInput, {
        ...DEFAULT_VIDEO_SETTINGS,
        aspectRatio: result.veoInput.aspectRatio,
        videoQuality: result.veoInput.videoQuality ?? '720p',
        veoModel: result.veoInput.veoModel ?? '',
      }),
      aspectRatio: result.veoInput.aspectRatio,
    });

    void runSceneGenerationQueue(
      pendingScenes,
      result.ttsInput,
      result.veoInput,
      {
        onScenesUpdate: (scenes) => {
          if (generationEpochRef.current.get(projectId) !== epoch) return;
          updateProject(projectId, {
            scenes,
            scenesDone: countScenesDone(scenes),
            scenesTotal: scenes.length,
            status: 'generating',
          });
        },
      },
    ).then((finalScenes) => {
      if (generationEpochRef.current.get(projectId) !== epoch) return;
      const hasError = finalScenes.some((s) => s.status === 'error');
      setProjects((prev) =>
        patchProject(prev, projectId, (p) => {
          const timelineDemo = p.pendingTimelineDemo ?? p.timelineDemo;
          return {
            scenes: finalScenes,
            scenesDone: countScenesDone(finalScenes),
            scenesTotal: finalScenes.length,
            status: hasError ? 'error' : 'completed',
            timelineDemo,
            pendingTimelineDemo: null,
          };
        }),
      );
    });
  }, [updateProject]);

  const startBulkAnalyze = useCallback((projectId: string, input: BulkAnalyzeInput) => {
    const epoch = (generationEpochRef.current.get(projectId) ?? 0) + 1;
    generationEpochRef.current.set(projectId, epoch);

    updateProject(projectId, {
      status: 'analyzing',
      inputContent: input.sourceContent,
    });

    void (async () => {
      try {
        const { script, veoInput, ttsInput } = await geminiService.analyzeScript(input.pipeline);
        if (generationEpochRef.current.get(projectId) !== epoch) return;

        const scenes = scenesFromGeminiScript(
          script,
          veoInput.sceneDuration,
          veoInput.videoQuality,
        );

        runSceneGeneration(projectId, {
          scenes,
          sourceContent: input.sourceContent,
          sceneCount: input.sceneCount,
          videoType: input.videoType,
          language: input.language,
          aspectRatio: veoInput.aspectRatio,
          sceneDuration: veoInput.sceneDuration,
          veoInput,
          ttsInput,
        }, epoch);
      } catch {
        if (generationEpochRef.current.get(projectId) !== epoch) return;
        updateProject(projectId, { status: 'error' });
      }
    })();
  }, [updateProject, runSceneGeneration]);

  const value = useMemo(
    () => ({
      projects,
      activeProjectId,
      activeProject,
      createProject,
      selectProject,
      deleteProject,
      deleteAllProjects,
      updateActiveProject,
      setActiveScenes,
      setActiveTimelineFocus,
      applyPresetToActive,
      syncSettingsForProject,
      startBulkAnalyze,
    }),
    [
      projects,
      activeProjectId,
      activeProject,
      createProject,
      selectProject,
      deleteProject,
      deleteAllProjects,
      updateActiveProject,
      setActiveScenes,
      setActiveTimelineFocus,
      applyPresetToActive,
      syncSettingsForProject,
      startBulkAnalyze,
    ],
  );

  return (
    <BulkProjectsContext.Provider value={value}>
      {children}
    </BulkProjectsContext.Provider>
  );
}

export function useBulkProjects(): BulkProjectsContextValue {
  const ctx = useContext(BulkProjectsContext);
  if (!ctx) {
    throw new Error('useBulkProjects must be used within BulkProjectsProvider');
  }
  return ctx;
}
