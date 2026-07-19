'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { PresetInput, PresetScript, PresetTimelineDemo } from '@/lib/preset/preset-scripts';
import type { SceneGenerationResult, VideoScene } from '@/lib/scene/scenes';
import { scenesFromGeminiScript } from '@/lib/scene/scenes';
import type { VideoSettings } from '@/contexts/project-settings-context';
import { DEFAULT_VIDEO_SETTINGS } from '@/contexts/project-settings-context';
import type { AnalyzePipelineRequest, PipelineCharacter, TtsInput, VeoInput } from '@/lib/pipeline-payload';
import { parseDataUrl } from '@/lib/pipeline-payload';
import { runSceneGenerationQueue, scenesNeedingVeoResume } from '@/lib/scene/scene-generation-queue';
import { normalizeSceneDurationSetting } from '@/lib/saved-scripts/saved-scripts';
import { buildDemoScenesFromPreset } from '@/lib/preset/preset-demo-builder';
import { geminiService } from '@/services/gemini/gemini.service';
import {
  countScenesDone,
  createInitialVideoItem,
  createVideoItem,
  formatVideoItemTitle,
  resolveVeoModelLabel,
  type CreateVideoItemOptions,
  type VideoLibraryItem,
} from '@/lib/video-library/video-library';
import {
  loadVideoLibraryPersist,
  saveVideoLibraryPersist,
  normalizeItemOnLoad,
} from '@/lib/video-library/video-library-persist';
import { toUserMessage } from '@/lib/error-messages';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { fetchRemoteVideoLibrary, pushVideoLibraryToRemote } from '@/lib/video-library/video-library-remote';
import {
  resolveSceneSignedUrls,
  uploadSceneAssets,
  deleteSceneAssets,
  deleteProjectStorageAssets,
} from '@/lib/video-library/video-library-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AnalyzeInput {
  pipeline: AnalyzePipelineRequest;
  sourceContent: string;
  sceneCount: string;
  videoType: string;
  language: string;
  /** Tab "Từ hình ảnh" — ảnh theo đúng thứ tự cảnh, ảnh[i] gắn vào scenes[i] để gửi Veo */
  sceneImages?: Array<{ base64: string; mimeType: string } | null>;
}

type GenerationMode = 'live' | 'regenerate';

interface RunSceneGenerationOptions {
  resumeOnly?: boolean;
  mode?: GenerationMode;
}

interface VideoLibraryContextValue {
  items: VideoLibraryItem[];
  activeItemId: string;
  activeItem: VideoLibraryItem;
  createItem: (options: CreateVideoItemOptions) => string;
  selectItem: (id: string) => void;
  deleteItem: (id: string) => void;
  deleteAllItems: () => void;
  updateItem: (
    id: string,
    patch: Partial<VideoLibraryItem> | ((p: VideoLibraryItem) => Partial<VideoLibraryItem>),
  ) => void;
  renameItem: (id: string, title: string) => void;
  updateActiveItem: (patch: Partial<VideoLibraryItem>) => void;
  setActiveScenes: Dispatch<SetStateAction<VideoScene[]>>;
  setActiveTimelineFocus: (sceneId: string | null) => void;
  applyPresetToActive: (input: PresetInput, timeline: PresetTimelineDemo | null) => void;
  /** Demo mục 3 & 4 không cần API key — dùng demoScenes có sẵn + video placeholder canvas */
  applyPresetAsDemo: (preset: PresetScript) => boolean;
  syncSettingsForItem: (itemId: string, settings: VideoSettings) => void;
  startAnalyze: (itemId: string, input: AnalyzeInput) => boolean;
  /** Sửa nội dung/settings 1 video đã có & tạo lại cảnh — giữ cảnh cũ tới khi xong */
  startRegenerate: (itemId: string, input: AnalyzeInput) => boolean;
  /** Xác nhận preview tab link (sau khi xem/sửa Master Cast) — thật sự bắt đầu gọi TTS/Veo */
  confirmLinkGeneration: (itemId: string, imageDataUrl?: string) => boolean;
  /** Upload video/audio cảnh (blob:) của project active lên Supabase Storage */
  saveActiveSceneVideos: () => Promise<{ saved: number; failed: number }>;
  /** Xoá file Storage của các cảnh vừa bị xoá khỏi mục 3 */
  deleteSceneStorageAssets: (scenes: VideoScene[]) => void;
}

const VideoLibraryContext = createContext<VideoLibraryContextValue | null>(null);

function patchItem(
  items: VideoLibraryItem[],
  id: string,
  patch: Partial<VideoLibraryItem> | ((p: VideoLibraryItem) => Partial<VideoLibraryItem>),
): VideoLibraryItem[] {
  return items.map((p) => {
    if (p.id !== id) return p;
    const delta = typeof patch === 'function' ? patch(p) : patch;
    return { ...p, ...delta, updatedAt: new Date().toISOString() };
  });
}

export function VideoLibraryProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const supabaseRef = useRef(createClient());
  /** userId đã đồng bộ remote — tránh fetch lại nhiều lần cho cùng 1 tài khoản */
  const remoteSyncedForUserRef = useRef<string | null>(null);
  /** Chỉ cho phép lưu lên Supabase sau khi đã fetch/migrate xong lần đầu — tránh
   *  race ghi đè dữ liệu cloud bằng state cục bộ cũ trong lúc đang đồng bộ. */
  const [remoteReady, setRemoteReady] = useState(false);

  const initial = useMemo(() => [createInitialVideoItem()], []);
  const [items, setItems] = useState<VideoLibraryItem[]>(initial);
  const [activeItemId, setActiveItemId] = useState(initial[0].id);
  const [persistReady, setPersistReady] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const activeItemIdRef = useRef(activeItemId);
  activeItemIdRef.current = activeItemId;
  /** Mỗi video có epoch riêng — tránh queue cũ ghi đè khi chạy lại (luồng live) */
  const generationEpochRef = useRef<Map<string, number>>(new Map());
  /** Chống double-click / gọi startAnalyze trùng (luồng live) */
  const analyzeInFlightRef = useRef<Set<string>>(new Set());
  /** Video đã resume poll sau refresh */
  const resumedItemsRef = useRef<Set<string>>(new Set());
  /** Epoch riêng cho luồng "Sửa & tạo lại" — tách biệt hoàn toàn khỏi luồng live */
  const regenEpochRef = useRef<Map<string, number>>(new Map());
  /** Chống gọi startRegenerate trùng */
  const regenerateInFlightRef = useRef<Set<string>>(new Set());
  /** Đánh dấu đã từng đăng nhập trong phiên này — phát hiện đúng thời điểm đăng xuất */
  const wasLoggedInRef = useRef(false);
  /** Đang có 1 lượt push lên Supabase chạy — chặn gọi chồng lấn trong cùng tab */
  const pushRunningRef = useRef(false);
  /** items đổi tiếp trong lúc push đang chạy — chạy thêm đúng 1 lượt nữa sau khi xong */
  const pushDirtyRef = useRef(false);

  // Luôn nạp localStorage trước — có UI ngay, không chờ auth resolve
  useEffect(() => {
    const stored = loadVideoLibraryPersist();
    if (stored) {
      setItems(stored.items);
      setActiveItemId(stored.activeItemId);
    }
    setPersistReady(true);
  }, []);

  // Có tài khoản đăng nhập → đồng bộ Supabase: tài khoản đã có dữ liệu thì tải về
  // (Supabase thành nguồn sự thật), tài khoản mới thì đẩy dữ liệu cục bộ hiện có lên 1 lần.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      remoteSyncedForUserRef.current = null;
      setRemoteReady(false);
      if (wasLoggedInRef.current) {
        // Vừa đăng xuất — xóa sạch kho video của tài khoản cũ khỏi màn hình ngay,
        // không chờ reload. Không lo mất dữ liệu vì đã đồng bộ lên Supabase, xem
        // lại được khi đăng nhập lại đúng tài khoản đó.
        wasLoggedInRef.current = false;
        const fresh = createVideoItem({ title: formatVideoItemTitle(), settings: DEFAULT_VIDEO_SETTINGS });
        setItems([fresh]);
        setActiveItemId(fresh.id);
      }
      return;
    }
    wasLoggedInRef.current = true;
    if (remoteSyncedForUserRef.current === user.id) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    remoteSyncedForUserRef.current = user.id;
    setRemoteReady(false);

    (async () => {
      try {
        const rawItems = (await fetchRemoteVideoLibrary(supabase, user.id)).map(normalizeItemOnLoad);
        const remoteItems = await resolveSceneSignedUrls(supabase, rawItems);
        if (remoteItems.length > 0) {
          setItems(remoteItems);
          setActiveItemId((prev) => (remoteItems.some((i) => i.id === prev) ? prev : remoteItems[0].id));
        } else {
          await pushVideoLibraryToRemote(supabase, user.id, itemsRef.current);
        }
      } catch (err) {
        console.error('[video-library] Đồng bộ Supabase thất bại:', err);
      } finally {
        setRemoteReady(true);
      }
    })();
  }, [user, authLoading]);

  /**
   * Chạy pushVideoLibraryToRemote tối đa 1 lượt tại 1 thời điểm cho tab này — nếu
   * items đổi tiếp trong lúc đang push, chạy thêm đúng 1 lượt nữa ngay sau khi lượt
   * hiện tại xong (dùng itemsRef.current mới nhất) thay vì để 2 lượt chạy chồng lấn.
   */
  const runPushToRemote = useCallback((supabase: SupabaseClient, userId: string) => {
    if (pushRunningRef.current) {
      pushDirtyRef.current = true;
      return;
    }
    pushRunningRef.current = true;
    void (async () => {
      try {
        do {
          pushDirtyRef.current = false;
          await pushVideoLibraryToRemote(supabase, userId, itemsRef.current);
        } while (pushDirtyRef.current);
      } catch (err) {
        console.error('[video-library] Lưu Supabase thất bại:', err);
      } finally {
        pushRunningRef.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    if (!persistReady) return;
    const supabase = supabaseRef.current;
    const useRemote = Boolean(user) && remoteReady && Boolean(supabase);

    const timer = window.setTimeout(() => {
      if (useRemote && supabase && user) {
        runPushToRemote(supabase, user.id);
      } else if (!user) {
        saveVideoLibraryPersist(itemsRef.current, activeItemIdRef.current);
      }
      // user tồn tại nhưng remote chưa sẵn sàng (đang đồng bộ lần đầu) → bỏ qua lượt
      // lưu này, tránh ghi đè dữ liệu cloud bằng state cũ trong lúc đang race với fetch.
    }, 600);
    return () => window.clearTimeout(timer);
  }, [items, activeItemId, persistReady, user, remoteReady, runPushToRemote]);

  const activeItem = useMemo(
    () => items.find((p) => p.id === activeItemId) ?? items[0],
    [items, activeItemId],
  );

  const updateItem = useCallback((
    id: string,
    patch: Partial<VideoLibraryItem> | ((p: VideoLibraryItem) => Partial<VideoLibraryItem>),
  ) => {
    setItems((prev) => {
      const next = patchItem(prev, id, patch);
      // Đồng bộ ref ngay — confirm/Master Cast không phụ thuộc chờ re-render
      itemsRef.current = next;
      return next;
    });
  }, []);

  const renameItem = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    updateItem(id, { title: trimmed });
  }, [updateItem]);

  const createItem = useCallback((options: CreateVideoItemOptions) => {
    const item = createVideoItem(options);
    setItems((prev) => [item, ...prev]);
    setActiveItemId(item.id);
    return item.id;
  }, []);

  const selectItem = useCallback((id: string) => {
    if (itemsRef.current.some((p) => p.id === id)) {
      setActiveItemId(id);
    }
  }, []);

  /** Xoá file Storage (scene-videos/scene-audio) của 1 hoặc nhiều project — chạy nền, không chặn UI, lỗi chỉ log */
  const cleanupProjectStorage = useCallback((projectIds: string[]) => {
    const supabase = supabaseRef.current;
    if (!supabase || !user || projectIds.length === 0) return;
    for (const projectId of projectIds) {
      void deleteProjectStorageAssets(supabase, user.id, projectId).catch((err) => {
        console.error('[video-library] Xoá file Storage của project thất bại:', err);
      });
    }
  }, [user]);

  const deleteItem = useCallback((id: string) => {
    cleanupProjectStorage([id]);
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        const fresh = createVideoItem({ title: formatVideoItemTitle(), settings: DEFAULT_VIDEO_SETTINGS });
        setActiveItemId(fresh.id);
        return [fresh];
      }
      if (id === activeItemId) {
        setActiveItemId(next[0].id);
      }
      return next;
    });
  }, [activeItemId, cleanupProjectStorage]);

  const deleteAllItems = useCallback(() => {
    cleanupProjectStorage(itemsRef.current.map((p) => p.id));
    const fresh = createVideoItem({ title: formatVideoItemTitle(), settings: DEFAULT_VIDEO_SETTINGS });
    setItems([fresh]);
    setActiveItemId(fresh.id);
  }, [cleanupProjectStorage]);

  const updateActiveItem = useCallback((patch: Partial<VideoLibraryItem>) => {
    updateItem(activeItemId, patch);
  }, [activeItemId, updateItem]);

  const setActiveScenes = useCallback((updater: SetStateAction<VideoScene[]>) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== activeItemId) return p;
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
  }, [activeItemId]);

  /**
   * Upload video/audio (blob: URL) của các cảnh đã sinh thành công trong project
   * đang active lên Supabase Storage — tránh mất khi F5 (phải tạo lại bằng AI).
   * Patch videoPath/audioPath ngay sau mỗi cảnh upload xong (không đợi hết mới
   * patch 1 lần) để UI cập nhật dần; auto-sync debounce sẵn có sẽ tự đẩy path
   * này lên bảng video_scenes, không cần gọi ghi DB riêng ở đây.
   */
  const saveActiveSceneVideos = useCallback(async (): Promise<{ saved: number; failed: number }> => {
    const supabase = supabaseRef.current;
    if (!supabase || !user) {
      throw new Error('Cần đăng nhập để lưu video lên cloud.');
    }

    const item = itemsRef.current.find((p) => p.id === activeItemIdRef.current);
    if (!item) return { saved: 0, failed: 0 };

    const targets = item.scenes.filter(
      (s) => s.status === 'success' && s.videoUrl?.startsWith('blob:') && !s.videoPath,
    );
    if (targets.length === 0) return { saved: 0, failed: 0 };

    let saved = 0;
    let failed = 0;

    for (const scene of targets) {
      try {
        const { videoPath, audioPath } = await uploadSceneAssets(supabase, user.id, item.id, scene);
        setActiveScenes((prev) =>
          prev.map((s) =>
            s.id === scene.id
              ? { ...s, videoPath: videoPath ?? s.videoPath, audioPath: audioPath ?? s.audioPath }
              : s,
          ),
        );
        saved++;
      } catch (err) {
        console.error('[video-library] Lưu video Storage thất bại:', err);
        failed++;
      }
    }

    return { saved, failed };
  }, [user, setActiveScenes]);

  /** Xoá file Storage của các cảnh vừa bị xoá khỏi mục 3 — chạy nền, không chặn UI, lỗi chỉ log */
  const deleteSceneStorageAssets = useCallback((scenes: VideoScene[]) => {
    const supabase = supabaseRef.current;
    if (!supabase || !user) return;
    void deleteSceneAssets(supabase, scenes).catch((err) => {
      console.error('[video-library] Xoá file Storage của cảnh thất bại:', err);
    });
  }, [user]);

  const setActiveTimelineFocus = useCallback((sceneId: string | null) => {
    updateItem(activeItemId, { timelineFocusSceneId: sceneId });
  }, [activeItemId, updateItem]);

  const applyPresetToActive = useCallback((input: PresetInput, timeline: PresetTimelineDemo | null) => {
    updateItem(activeItemId, (p) => ({
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
  }, [activeItemId, updateItem]);

  const syncSettingsForItem = useCallback((itemId: string, settings: VideoSettings) => {
    const item = itemsRef.current.find((p) => p.id === itemId);
    updateItem(itemId, {
      settings,
      aspectRatio: settings.aspectRatio,
      veoModelLabel: resolveVeoModelLabel(item?.veoInput ?? null, settings),
    });
  }, [updateItem]);

  const runSceneGeneration = useCallback((
    itemId: string,
    result: SceneGenerationResult,
    epoch: number,
    options?: RunSceneGenerationOptions,
  ) => {
    const mode: GenerationMode = options?.mode ?? 'live';
    const epochRef = mode === 'regenerate' ? regenEpochRef : generationEpochRef;
    const inFlightRef = mode === 'regenerate' ? regenerateInFlightRef : analyzeInFlightRef;

    const existing = itemsRef.current.find((p) => p.id === itemId);
    const pendingScenes = options?.resumeOnly && existing
      ? existing.scenes
      : result.scenes.map((s) => ({ ...s, status: 'generating' as const }));

    console.log(`[video-library] runSceneGeneration cho ${itemId} — mode=${mode}, resumeOnly=${options?.resumeOnly}, pendingScenes:`, pendingScenes.map((s) => ({ id: s.id, status: s.status, hasVideoUrl: Boolean(s.videoUrl) })));

    if (mode === 'live') {
      if (!options?.resumeOnly) {
        updateItem(itemId, {
          status: 'generating',
          errorMessage: undefined,
          inputContent: result.sourceContent,
          inputType: result.inputType,
          masterCastPrompt: result.masterCastPrompt,
          ttsInput: result.ttsInput,
          veoInput: result.veoInput,
          scenes: pendingScenes,
          scenesDone: countScenesDone(pendingScenes),
          scenesTotal: pendingScenes.length,
          veoModelLabel: resolveVeoModelLabel(result.veoInput, {
            ...DEFAULT_VIDEO_SETTINGS,
            aspectRatio: result.veoInput.aspectRatio,
            videoQuality: result.veoInput.videoQuality ?? '720p',
            veoModel: result.veoInput.veoModel ?? '',
          }),
          aspectRatio: result.veoInput.aspectRatio,
        });
      } else {
        updateItem(itemId, { status: 'generating', errorMessage: undefined });
      }
    } else {
      // Tạo lại — ghi vào pendingRegeneration, KHÔNG đụng scenes/status sống
      updateItem(itemId, (p) => ({
        pendingRegeneration: {
          status: 'generating',
          errorMessage: undefined,
          scenes: pendingScenes,
          scenesDone: countScenesDone(pendingScenes),
          scenesTotal: pendingScenes.length,
          ttsInput: result.ttsInput,
          veoInput: result.veoInput,
          inputContent: result.sourceContent,
          timelineDemo: p.pendingRegeneration?.timelineDemo ?? null,
        },
      }));
    }

    const ttsInput = result.ttsInput ?? existing?.ttsInput;
    const veoInput = result.veoInput ?? existing?.veoInput;
    if (!ttsInput || !veoInput) return;

    void runSceneGenerationQueue(
      pendingScenes,
      ttsInput,
      veoInput,
      {
        shouldContinue: () => epochRef.current.get(itemId) === epoch,
        onFatalError: (message) => {
          if (epochRef.current.get(itemId) !== epoch) return;
          if (mode === 'live') {
            updateItem(itemId, { status: 'error', errorMessage: message });
          } else {
            updateItem(itemId, (p) => ({
              pendingRegeneration: p.pendingRegeneration
                ? { ...p.pendingRegeneration, errorMessage: message }
                : null,
            }));
          }
        },
        onPersistScenes: (scenes) => {
          if (epochRef.current.get(itemId) !== epoch) return;
          if (!persistReady) return;
          const next = mode === 'live'
            ? patchItem(itemsRef.current, itemId, {
                scenes,
                scenesDone: countScenesDone(scenes),
                scenesTotal: scenes.length,
                status: 'generating',
              })
            : patchItem(itemsRef.current, itemId, (p) => ({
                pendingRegeneration: p.pendingRegeneration
                  ? {
                      ...p.pendingRegeneration,
                      scenes,
                      scenesDone: countScenesDone(scenes),
                      scenesTotal: scenes.length,
                    }
                  : null,
              }));
          itemsRef.current = next;
          saveVideoLibraryPersist(next, activeItemIdRef.current);
        },
        onScenesUpdate: (scenes) => {
          if (epochRef.current.get(itemId) !== epoch) return;
          if (mode === 'live') {
            updateItem(itemId, {
              scenes,
              scenesDone: countScenesDone(scenes),
              scenesTotal: scenes.length,
              status: 'generating',
            });
          } else {
            updateItem(itemId, (p) => ({
              pendingRegeneration: p.pendingRegeneration
                ? {
                    ...p.pendingRegeneration,
                    scenes,
                    scenesDone: countScenesDone(scenes),
                    scenesTotal: scenes.length,
                  }
                : null,
            }));
          }
        },
      },
    ).then((finalScenes) => {
      if (epochRef.current.get(itemId) !== epoch) return;
      const erroredScenes = finalScenes.filter((s) => s.status === 'error');
      const hasError = erroredScenes.length > 0;
      const summaryMessage = hasError
        ? erroredScenes.length === 1
          ? (erroredScenes[0].errorMessage ?? 'Một cảnh tạo thất bại — xem chi tiết ở danh sách cảnh.')
          : `${erroredScenes.length} cảnh tạo thất bại — xem chi tiết ở danh sách cảnh.`
        : undefined;

      if (mode === 'live') {
        setItems((prev) =>
          patchItem(prev, itemId, (p) => {
            const timelineDemo = p.pendingTimelineDemo ?? p.timelineDemo;
            return {
              scenes: finalScenes,
              scenesDone: countScenesDone(finalScenes),
              scenesTotal: finalScenes.length,
              status: hasError ? 'error' : 'completed',
              errorMessage: summaryMessage,
              timelineDemo,
              pendingTimelineDemo: null,
            };
          }),
        );
        return;
      }

      if (hasError) {
        // Tạo lại thất bại — giữ nguyên scenes/status sống, chỉ báo lỗi riêng
        setItems((prev) =>
          patchItem(prev, itemId, {
            isRegenerating: false,
            pendingRegeneration: null,
            regenerateError: summaryMessage,
          }),
        );
      } else {
        // Tạo lại thành công — swap vào field sống
        setItems((prev) =>
          patchItem(prev, itemId, (p) => ({
            scenes: finalScenes,
            scenesDone: countScenesDone(finalScenes),
            scenesTotal: finalScenes.length,
            ttsInput: p.pendingRegeneration?.ttsInput ?? p.ttsInput,
            veoInput: p.pendingRegeneration?.veoInput ?? p.veoInput,
            inputContent: p.pendingRegeneration?.inputContent ?? p.inputContent,
            status: 'completed',
            errorMessage: undefined,
            isRegenerating: false,
            pendingRegeneration: null,
            regenerateError: undefined,
          })),
        );
      }
    }).finally(() => {
      inFlightRef.current.delete(itemId);
    });
  }, [updateItem, persistReady]);

  /**
   * Demo mục 3 & 4 không cần API key — bỏ qua bước gọi Gemini, dùng thẳng
   * demoScenes có sẵn trong preset rồi chạy qua đúng hàng đợi sinh cảnh thật
   * (runSceneGeneration). Vì ttsInput/veoInput không có apiKey, hàng đợi tự
   * động bỏ qua TTS và dùng video placeholder canvas — cùng UI/logic y hệt
   * luồng tạo video thật.
   */
  const applyPresetAsDemo = useCallback((preset: PresetScript): boolean => {
    const itemId = activeItemId;
    const item = itemsRef.current.find((p) => p.id === itemId);
    if (!item) return false;
    if (item.status === 'analyzing' || item.status === 'generating') return false;
    if (item.isRegenerating) return false;
    if (analyzeInFlightRef.current.has(itemId)) return false;

    analyzeInFlightRef.current.add(itemId);
    const epoch = (generationEpochRef.current.get(itemId) ?? 0) + 1;
    generationEpochRef.current.set(itemId, epoch);

    const input = preset.input;
    const veoInput: VeoInput = {
      aspectRatio: input.aspectRatio ?? '16:9',
      sceneDuration: normalizeSceneDurationSetting(input.sceneDuration ?? '6', input.videoQuality ?? '720p'),
      videoQuality: input.videoQuality ?? '720p',
      veoModel: input.veoModel,
      sceneStyleId: input.sceneStyleId,
    };
    const ttsInput: TtsInput = {
      voice: input.voice,
      language: input.language,
      voiceSpeed: input.voiceSpeed ?? 1,
    };

    updateItem(itemId, (p) => ({
      appliedInput: input,
      inputContent: input.content,
      settings: {
        ...p.settings,
        language: input.language,
        sceneCount: String(preset.demoScenes.length),
        videoType: input.videoType,
        voice: input.voice,
        aspectRatio: veoInput.aspectRatio,
        sceneDuration: veoInput.sceneDuration,
        videoQuality: veoInput.videoQuality ?? '720p',
        veoModel: input.veoModel ?? '',
        voiceSpeed: input.voiceSpeed ?? p.settings.voiceSpeed,
        sceneStyle: input.sceneStyleId ?? p.settings.sceneStyle,
      },
      aspectRatio: veoInput.aspectRatio,
      pendingTimelineDemo: preset.timeline,
    }));

    runSceneGeneration(itemId, {
      scenes: buildDemoScenesFromPreset(preset),
      sourceContent: input.content,
      sceneCount: String(preset.demoScenes.length),
      videoType: input.videoType,
      language: input.language,
      aspectRatio: veoInput.aspectRatio,
      sceneDuration: veoInput.sceneDuration,
      veoInput,
      ttsInput,
    }, epoch);

    return true;
  }, [activeItemId, updateItem, runSceneGeneration]);

  const startAnalyze = useCallback((itemId: string, input: AnalyzeInput): boolean => {
    const item = itemsRef.current.find((p) => p.id === itemId);
    if (!item) return false;

    if (item.status === 'analyzing' || item.status === 'generating') {
      return false;
    }
    if (item.isRegenerating) {
      return false;
    }
    if (analyzeInFlightRef.current.has(itemId)) {
      return false;
    }

    analyzeInFlightRef.current.add(itemId);

    const epoch = (generationEpochRef.current.get(itemId) ?? 0) + 1;
    generationEpochRef.current.set(itemId, epoch);

    updateItem(itemId, {
      status: 'analyzing',
      errorMessage: undefined,
      inputContent: input.sourceContent,
    });

    void (async () => {
      try {
        const { script, veoInput, ttsInput } = await geminiService.analyzeScript(input.pipeline);
        if (generationEpochRef.current.get(itemId) !== epoch) return;

        //đoạn này là chia kịch bản thành các cảnh
        // script là kịch bản từ Gemini
        // sceneDurationSetting là độ dài của cảnh
        // videoQuality là chất lượng video
        // trả về mảng các cảnh
        let scenes = scenesFromGeminiScript(
          script,
          veoInput.sceneDuration,
          veoInput.videoQuality,
          veoInput.provider,
        );

        // Tab "Từ hình ảnh" — gắn đúng ảnh[i] vào scenes[i] theo thứ tự, để Veo
        // dùng ảnh đó làm ảnh mồi tạo video cho đúng cảnh tương ứng.
        if (input.sceneImages) {
          scenes = scenes.map((s, i) => {
            const img = input.sceneImages?.[i];
            return img ? { ...s, sourceImageBase64: img.base64, sourceImageMimeType: img.mimeType } : s;
          });
        }

        const result: SceneGenerationResult = {
          scenes,
          sourceContent: input.sourceContent,
          sceneCount: input.sceneCount,
          videoType: input.videoType,
          language: input.language,
          aspectRatio: veoInput.aspectRatio,
          sceneDuration: veoInput.sceneDuration,
          veoInput,
          ttsInput,
          inputType: input.pipeline.geminiInput.inputType,
          masterCastPrompt: script.masterCastPrompt,
        };

        if (input.pipeline.geminiInput.inputType === 'link') {
          // Tab link: dừng lại chờ xác nhận — hiện Master Cast + preview cảnh để
          // user xem/sửa prompt và upload ảnh tham chiếu TRƯỚC khi thật sự gọi TTS/Veo.
          updateItem(itemId, {
            status: 'draft',
            errorMessage: undefined,
            inputContent: result.sourceContent,
            inputType: result.inputType,
            masterCastPrompt: result.masterCastPrompt,
            scenes: scenes.map((s) => ({ ...s, status: 'edited' as const })),
            scenesDone: 0,
            scenesTotal: scenes.length,
            pendingLinkReview: result,
          });
          analyzeInFlightRef.current.delete(itemId);
          return;
        }

        runSceneGeneration(itemId, result, epoch);
      } catch (err) {
        if (generationEpochRef.current.get(itemId) !== epoch) return;
        const message = toUserMessage(err, 'Phân tích kịch bản thất bại — kiểm tra lại Gemini API Key và thử lại.');
        updateItem(itemId, { status: 'error', errorMessage: message });
        analyzeInFlightRef.current.delete(itemId);
      }
    })();

    return true;
  }, [updateItem, runSceneGeneration]);


  const startRegenerate = useCallback((itemId: string, input: AnalyzeInput): boolean => {
    const item = itemsRef.current.find((p) => p.id === itemId);
    if (!item) return false;

    if (item.status === 'analyzing' || item.status === 'generating') {
      return false;
    }
    if (item.isRegenerating) {
      return false;
    }
    if (analyzeInFlightRef.current.has(itemId) || regenerateInFlightRef.current.has(itemId)) {
      return false;
    }

    regenerateInFlightRef.current.add(itemId);

    const epoch = (regenEpochRef.current.get(itemId) ?? 0) + 1;
    regenEpochRef.current.set(itemId, epoch);

    updateItem(itemId, {
      isRegenerating: true,
      regenerateError: undefined,
      pendingRegeneration: {
        status: 'analyzing',
        scenes: [],
        scenesDone: 0,
        scenesTotal: 0,
        ttsInput: null,
        veoInput: null,
        inputContent: input.sourceContent,
        timelineDemo: null,
      },
    });

    void (async () => {
      try {
        const { script, veoInput, ttsInput } = await geminiService.analyzeScript(input.pipeline);
        if (regenEpochRef.current.get(itemId) !== epoch) return;

        const scenes = scenesFromGeminiScript(
          script,
          veoInput.sceneDuration,
          veoInput.videoQuality,
          veoInput.provider,
        );

        runSceneGeneration(itemId, {
          scenes,
          sourceContent: input.sourceContent,
          sceneCount: input.sceneCount,
          videoType: input.videoType,
          language: input.language,
          aspectRatio: veoInput.aspectRatio,
          sceneDuration: veoInput.sceneDuration,
          veoInput,
          ttsInput,
        }, epoch, { mode: 'regenerate' });
      } catch (err) {
        if (regenEpochRef.current.get(itemId) !== epoch) return;
        const message = toUserMessage(err, 'Tạo lại kịch bản thất bại — kiểm tra lại Gemini API Key và thử lại.');
        updateItem(itemId, { isRegenerating: false, pendingRegeneration: null, regenerateError: message });
        regenerateInFlightRef.current.delete(itemId);
      }
    })();

    return true;
  }, [updateItem, runSceneGeneration]);

  /** Xác nhận preview tab link — đính kèm ảnh Master Cast rồi mới chạy TTS/Veo/Kie */
  const confirmLinkGeneration = useCallback((itemId: string, imageDataUrl?: string): boolean => {
    const item = itemsRef.current.find((p) => p.id === itemId);
    if (!item?.pendingLinkReview) return false;
    if (item.status === 'analyzing' || item.status === 'generating') return false;
    if (analyzeInFlightRef.current.has(itemId)) return false;

    // Ưu tiên ảnh truyền trực tiếp từ panel (tránh race state); fallback item đã lưu
    const rawImage = imageDataUrl?.trim() || item.masterCastImageDataUrl;
    const image = parseDataUrl(rawImage);

    console.log('[master-cast/confirm]', {
      itemId,
      provider: item.pendingLinkReview.veoInput.provider ?? 'veo',
      hasImageArg: Boolean(imageDataUrl?.trim()),
      hasItemImage: Boolean(item.masterCastImageDataUrl),
      hasParsedImage: Boolean(image),
      imageMime: image?.mimeType ?? null,
      imageBytesApprox: image ? Math.round((image.base64.length * 3) / 4) : 0,
    });

    if (!image) {
      console.warn('[master-cast/confirm] CHẶN — chưa có ảnh Master Cast, không gửi tạo video.');
      return false;
    }

    analyzeInFlightRef.current.add(itemId);

    const epoch = (generationEpochRef.current.get(itemId) ?? 0) + 1;
    generationEpochRef.current.set(itemId, epoch);

    const result = item.pendingLinkReview;
    const veoInput: VeoInput = {
      ...result.veoInput,
      // Field rõ ràng — mọi cảnh đọc referenceImage trước
      referenceImage: { base64: image.base64, mimeType: image.mimeType },
      // Mô tả Gemini Vision phân tích trực tiếp từ ảnh Character Sheet — chèn vào
      // đầu prompt mọi cảnh lúc gửi Veo/Kie để củng cố thêm cho ảnh tham chiếu
      masterCharacterText: item.masterCastImageDescription?.trim() || undefined,
      characters: [
        ...(result.veoInput.characters ?? []).filter((c) => c.name !== 'Master Cast'),
        {
          name: 'Master Cast',
          role: '',
          traits: '',
          outfit: '',
          description: item.masterCastPrompt ?? '',
          style: 'Realistic',
          imageBase64: image.base64,
          imageMimeType: image.mimeType,
        } satisfies PipelineCharacter,
      ],
    };

    console.log('[master-cast/confirm] Gắn referenceImage + Master Cast character — sẽ gửi kèm mỗi cảnh.', {
      characters: (veoInput.characters ?? []).map((c) => ({
        name: c.name,
        hasImage: Boolean(c.imageBase64),
      })),
      hasReferenceImage: Boolean(veoInput.referenceImage?.base64),
    });

    // Một lần update: lưu ảnh + xoá pending + giữ prompt
    updateItem(itemId, {
      pendingLinkReview: null,
      masterCastImageDataUrl: rawImage,
    });
    runSceneGeneration(itemId, { ...result, veoInput }, epoch);
    return true;
  }, [updateItem, runSceneGeneration]);

  // Resume poll Veo sau refresh — chỉ chạy 1 lần khi load persist, không gọi predictLongRunning lại
  useEffect(() => {
    if (!persistReady) return;
    // Có tài khoản đăng nhập thì Supabase mới là nguồn dữ liệu đúng — localStorage
    // (persistReady bật ngay khi mount, trước cả khi fetch Supabase xong) có thể còn
    // giữ bản ghi CŨ (vd. cảnh chụp lúc còn "generating", trong khi thực tế đã
    // "success" và đã lưu video từ lâu). Nếu xét resume ngay lúc này sẽ tự gọi lại
    // API dựa trên dữ liệu lỗi thời — đợi remoteReady để chắc chắn itemsRef.current
    // đã là dữ liệu Supabase mới nhất trước khi quyết định cảnh nào cần resume.
    if (user && !remoteReady) return;

    console.log('[video-library] resume-check chạy — items:', itemsRef.current.map((it) => ({
      id: it.id,
      title: it.title,
      itemStatus: it.status,
      hasTtsInput: Boolean(it.ttsInput),
      hasVeoInput: Boolean(it.veoInput),
      scenes: it.scenes.map((s) => ({
        id: s.id,
        status: s.status,
        hasVideoUrl: Boolean(s.videoUrl),
        hasVideoPath: Boolean(s.videoPath),
        veoOperationName: s.veoOperationName,
        kieTaskId: s.kieTaskId,
      })),
    })));

    for (const item of itemsRef.current) {
      if (resumedItemsRef.current.has(item.id)) continue;
      if (analyzeInFlightRef.current.has(item.id)) continue;
      if (!item.ttsInput || !item.veoInput) continue;
      const needResume = scenesNeedingVeoResume(item.scenes);
      if (needResume.length === 0) continue;

      console.log(`[video-library] RESUME TRIGGERED cho project "${item.title}" (${item.id}) — cảnh cần resume:`, needResume.map((s) => ({ id: s.id, status: s.status, veoOperationName: s.veoOperationName, kieTaskId: s.kieTaskId })));

      resumedItemsRef.current.add(item.id);

      const epoch = (generationEpochRef.current.get(item.id) ?? 0) + 1;
      generationEpochRef.current.set(item.id, epoch);
      analyzeInFlightRef.current.add(item.id);

      runSceneGeneration(item.id, {
        scenes: item.scenes,
        sourceContent: item.inputContent,
        sceneCount: item.settings.sceneCount,
        videoType: item.settings.videoType,
        language: item.settings.language,
        aspectRatio: item.veoInput.aspectRatio,
        sceneDuration: item.veoInput.sceneDuration,
        veoInput: item.veoInput,
        ttsInput: item.ttsInput,
      }, epoch, { resumeOnly: true });
    }
  }, [persistReady, remoteReady, user, runSceneGeneration]);

  const value = useMemo(
    () => ({
      items,
      activeItemId,
      activeItem,
      createItem,
      selectItem,
      deleteItem,
      deleteAllItems,
      updateItem,
      renameItem,
      updateActiveItem,
      setActiveScenes,
      setActiveTimelineFocus,
      applyPresetToActive,
      applyPresetAsDemo,
      syncSettingsForItem,
      startAnalyze,
      startRegenerate,
      confirmLinkGeneration,
      saveActiveSceneVideos,
      deleteSceneStorageAssets,
    }),
    [
      items,
      activeItemId,
      activeItem,
      createItem,
      selectItem,
      deleteItem,
      deleteAllItems,
      updateItem,
      renameItem,
      updateActiveItem,
      setActiveScenes,
      setActiveTimelineFocus,
      applyPresetToActive,
      applyPresetAsDemo,
      syncSettingsForItem,
      startAnalyze,
      startRegenerate,
      confirmLinkGeneration,
      saveActiveSceneVideos,
      deleteSceneStorageAssets,
    ],
  );

  return (
    <VideoLibraryContext.Provider value={value}>
      {children}
    </VideoLibraryContext.Provider>
  );
}

export function useVideoLibrary(): VideoLibraryContextValue {
  const ctx = useContext(VideoLibraryContext);
  if (!ctx) {
    throw new Error('useVideoLibrary must be used within VideoLibraryProvider');
  }
  return ctx;
}
