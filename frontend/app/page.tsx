'use client';

import { useState, useRef, useCallback } from 'react';
import { Sidebar, MobileNav, type AppView, type CreativeToolId } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { InputSection } from '@/components/features/input-section';
import { CharacterMaster, type CharacterMasterHandle } from '@/components/features/character-master';
import { SceneGallery } from '@/components/features/scene-gallery';
import { TimelineEditor } from '@/components/features/timeline-editor';
import { ApiKeysManagement } from '@/components/features/api-keys-management';
import { SettingsPanel } from '@/components/features/settings/settings-panel';
import { SceneDurationPanel } from '@/components/features/scene-duration';
import { PresetScriptModal } from '@/components/features/preset-script-modal';
import { SavedScriptsPanel } from '@/components/features/saved-scripts';
import { BulkListPanel, BulkListDrawer } from '@/components/features/bulk-list/bulk-list-panel';
import type { PresetScript } from '@/lib/preset-scripts';
import type { SavedScript } from '@/lib/saved-scripts';
import { generateScriptId, deriveTitle } from '@/lib/saved-scripts';
import type { SavedCharacter } from '@/lib/saved-characters';
import { BulkProjectsProvider, useBulkProjects } from '@/contexts/bulk-projects-context';
import { VeoModelsProvider } from '@/contexts/veo-models-context';
import { ProjectSettingsProvider, type VideoSettings } from '@/contexts/project-settings-context';

const viewTitles: Record<AppView, string> = {
  project: 'AI Video Studio',
  'api-keys': 'API Keys',
  settings: 'Cài đặt',
};

function ProjectWorkspace({
  activeTool,
  setActiveTool,
  focusVoiceSpeedKey,
  focusSceneStyleKey,
  focusContentKey,
  setFocusContentKey,
  focusBgmKey,
  setFocusBgmKey,
  selectedPreset,
  setSelectedPreset,
  characterSectionRef,
  inputSectionRef,
  sceneSectionRef,
  timelineSectionRef,
  characterMasterRef,
  savedScripts,
  savedScriptsSectionRef,
  onSaveScript,
  onUpdateScript,
  onDeleteScript,
  scrollToRef,
  onMenuOpen,
}: {
  activeTool: CreativeToolId | null;
  setActiveTool: (v: CreativeToolId | null) => void;
  focusVoiceSpeedKey: number;
  focusSceneStyleKey: number;
  focusContentKey: number;
  setFocusContentKey: React.Dispatch<React.SetStateAction<number>>;
  focusBgmKey: number;
  setFocusBgmKey: React.Dispatch<React.SetStateAction<number>>;
  selectedPreset: PresetScript | null;
  setSelectedPreset: (p: PresetScript | null) => void;
  characterSectionRef: React.RefObject<HTMLDivElement | null>;
  inputSectionRef: React.RefObject<HTMLDivElement | null>;
  sceneSectionRef: React.RefObject<HTMLDivElement | null>;
  timelineSectionRef: React.RefObject<HTMLDivElement | null>;
  characterMasterRef: React.RefObject<CharacterMasterHandle | null>;
  savedScripts: SavedScript[];
  savedScriptsSectionRef: React.RefObject<HTMLDivElement | null>;
  onSaveScript: (
    content: string,
    meta: { language: string; sceneCount: string; videoType: string; voice: string; aspectRatio: string; sceneDuration: string; videoQuality?: string },
  ) => void;
  onUpdateScript: (script: SavedScript) => void;
  onDeleteScript: (id: string) => void;
  scrollToRef: (ref: React.RefObject<HTMLDivElement | null>) => void;
  onMenuOpen: () => void;
}) {
  const {
    activeProject,
    setActiveScenes,
    setActiveTimelineFocus,
    syncSettingsForProject,
    applyPresetToActive,
    updateActiveProject,
  } = useBulkProjects();

  const [applyKey, setApplyKey] = useState(0);

  const handleContentChange = useCallback((inputContent: string) => {
    updateActiveProject({ inputContent });
  }, [updateActiveProject]);

  const handleCharactersChange = useCallback((characters: SavedCharacter[]) => {
    updateActiveProject({ characters });
  }, [updateActiveProject]);

  const handleApplySavedScript = useCallback((script: SavedScript) => {
    updateActiveProject({
      appliedInput: {
        content: script.content,
        language: script.meta.language,
        sceneCount: script.meta.sceneCount,
        videoType: script.meta.videoType,
        voice: script.meta.voice,
        aspectRatio: script.meta.aspectRatio ?? '16:9',
        sceneDuration: script.meta.sceneDuration ?? '6',
        videoQuality: script.meta.videoQuality ?? '720p',
      },
      inputContent: script.content,
    });
    setApplyKey((k) => k + 1);
    setFocusContentKey((k) => k + 1);
    setTimeout(() => scrollToRef(inputSectionRef), 100);
  }, [updateActiveProject, setFocusContentKey, scrollToRef, inputSectionRef]);

  const handleSettingsChange = useCallback((settings: VideoSettings) => {
    syncSettingsForProject(activeProject.id, settings);
  }, [syncSettingsForProject, activeProject.id]);

  return (
    <ProjectSettingsProvider
      projectKey={activeProject.id}
      initialSettings={activeProject.settings}
      onSettingsChange={handleSettingsChange}
    >
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        <Header
          title={viewTitles.project}
          showVideoSettings
          onMenuOpen={onMenuOpen}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden">
        <BulkListPanel />

        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8 pb-24 md:pb-6">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Bulk</span>
              <h2 className="text-sm font-bold text-foreground truncate">{activeProject.title}</h2>
              {(activeProject.status === 'generating' || activeProject.status === 'analyzing') && (
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">Đang chạy</span>
              )}
            </div>

            {activeTool === 'scene-duration' && (
              <SceneDurationPanel onClose={() => setActiveTool(null)} />
            )}

            <div ref={characterSectionRef}>
              <CharacterMaster
                key={activeProject.id}
                ref={characterMasterRef}
                initialCharacters={activeProject.characters}
                onCharactersChange={handleCharactersChange}
              />
            </div>

            <div ref={inputSectionRef}>
              <InputSection
                key={activeProject.id}
                projectId={activeProject.id}
                presetData={activeProject.appliedInput}
                presetKey={applyKey}
                initialContent={activeProject.inputContent}
                onContentChange={handleContentChange}
                onSaveScript={onSaveScript}
                focusVoiceSpeedKey={focusVoiceSpeedKey}
                focusSceneStyleKey={focusSceneStyleKey}
                focusContentKey={focusContentKey}
                characterMasterRef={characterMasterRef}
              />
            </div>

            {savedScripts.length > 0 && (
              <div ref={savedScriptsSectionRef}>
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
                      2.5. KỊCH BẢN ĐÃ LƯU ({savedScripts.length})
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Chọn để dùng lại · Sửa · Xóa
                    </span>
                  </div>
                  <SavedScriptsPanel
                    scripts={savedScripts}
                    onApply={handleApplySavedScript}
                    onUpdate={onUpdateScript}
                    onDelete={onDeleteScript}
                  />
                </section>
              </div>
            )}

            <div ref={sceneSectionRef}>
              <SceneGallery
                scenes={activeProject.scenes}
                onScenesChange={setActiveScenes}
                ttsInput={activeProject.ttsInput}
                veoInput={activeProject.veoInput}
                onSceneFocus={setActiveTimelineFocus}
              />
            </div>

            <div ref={timelineSectionRef}>
              <TimelineEditor
                key={activeProject.id}
                scenes={activeProject.scenes}
                focusBgmKey={focusBgmKey}
                timelineDefaults={activeProject.timelineDemo}
                focusSceneId={activeProject.timelineFocusSceneId}
                onFocusSceneHandled={() => setActiveTimelineFocus(null)}
              />
            </div>
          </div>
        </div>
        </div>
      </div>

      <PresetScriptModal
        preset={selectedPreset}
        onClose={() => setSelectedPreset(null)}
        onApply={(preset) => {
          setSelectedPreset(null);
          characterMasterRef.current?.applyDemoCharacters(preset.characters);
          applyPresetToActive(preset.input, preset.timeline);
          setApplyKey((k) => k + 1);
          setTimeout(() => scrollToRef(inputSectionRef), 100);
        }}
      />
    </ProjectSettingsProvider>
  );
}

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>('project');
  const [activeMenuId, setActiveMenuId] = useState('project');
  const [activeTool, setActiveTool] = useState<CreativeToolId | null>(null);
  const [settingsTab, setSettingsTab] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bulkDrawerOpen, setBulkDrawerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetScript | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const savedScriptsSectionRef = useRef<HTMLDivElement>(null);

  const [focusVoiceSpeedKey, setFocusVoiceSpeedKey] = useState(0);
  const [focusSceneStyleKey, setFocusSceneStyleKey] = useState(0);
  const [focusContentKey, setFocusContentKey] = useState(0);
  const [focusBgmKey, setFocusBgmKey] = useState(0);

  const characterSectionRef = useRef<HTMLDivElement>(null);
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const sceneSectionRef = useRef<HTMLDivElement>(null);
  const timelineSectionRef = useRef<HTMLDivElement>(null);
  const characterMasterRef = useRef<CharacterMasterHandle>(null);

  const scrollToRef = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSaveScript = useCallback((
    content: string,
    meta: { language: string; sceneCount: string; videoType: string; voice: string; aspectRatio: string; sceneDuration: string; videoQuality?: string },
  ) => {
    const now = new Date().toISOString();
    const newScript: SavedScript = {
      id: generateScriptId(),
      title: deriveTitle(content),
      content,
      meta,
      createdAt: now,
      updatedAt: now,
    };
    setSavedScripts((prev) => [newScript, ...prev]);
    setTimeout(() => savedScriptsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, []);

  const handleUpdateScript = useCallback((updated: SavedScript) => {
    setSavedScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleDeleteScript = useCallback((id: string) => {
    setSavedScripts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleMenuClick = (menuId: string, view: AppView) => {
    setActiveMenuId(menuId);
    setCurrentView(view);
    setSidebarOpen(false);
    if (view !== 'project') setActiveTool(null);
  };

  const handleToolClick = (toolId: CreativeToolId) => {
    setCurrentView('project');
    setActiveMenuId('project');
    setSidebarOpen(false);

    if (toolId === 'bulk-list') {
      setBulkDrawerOpen(true);
      setActiveTool('bulk-list');
      return;
    }

    setActiveTool(toolId === 'scene-duration' ? (activeTool === 'scene-duration' ? null : 'scene-duration') : null);

    switch (toolId) {
      case 'character': setTimeout(() => scrollToRef(characterSectionRef), 50); break;
      case 'content': setFocusContentKey((k) => k + 1); setTimeout(() => scrollToRef(inputSectionRef), 50); break;
      case 'scene-gallery': setTimeout(() => scrollToRef(sceneSectionRef), 50); break;
      case 'timeline': setTimeout(() => scrollToRef(timelineSectionRef), 50); break;
      case 'voice-speed': setFocusVoiceSpeedKey((k) => k + 1); setTimeout(() => scrollToRef(inputSectionRef), 50); break;
      case 'scene-style': setFocusSceneStyleKey((k) => k + 1); setTimeout(() => scrollToRef(inputSectionRef), 50); break;
      case 'scene-duration': setTimeout(() => scrollToRef(sceneSectionRef), 50); break;
      case 'background-music': setFocusBgmKey((k) => k + 1); setTimeout(() => scrollToRef(timelineSectionRef), 50); break;
    }
  };

  const handlePresetSelect = (preset: PresetScript) => {
    setCurrentView('project');
    setActiveMenuId('project');
    setSidebarOpen(false);
    setSelectedPreset(preset);
  };

  return (
    <BulkProjectsProvider>
      <VeoModelsProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar
            activeView={currentView}
            activeMenuId={activeMenuId}
            activeTool={activeTool}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            onMenuClick={handleMenuClick}
            onToolClick={handleToolClick}
            onPresetSelect={handlePresetSelect}
          />
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <Sidebar
                activeView={currentView}
                activeMenuId={activeMenuId}
                activeTool={activeTool}
                collapsed={false}
                onToggleCollapse={() => setSidebarOpen(false)}
                onMenuClick={handleMenuClick}
                onToolClick={handleToolClick}
                onPresetSelect={handlePresetSelect}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {currentView === 'project' ? (
            <ProjectWorkspace
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              focusVoiceSpeedKey={focusVoiceSpeedKey}
              focusSceneStyleKey={focusSceneStyleKey}
              focusContentKey={focusContentKey}
              setFocusContentKey={setFocusContentKey}
              focusBgmKey={focusBgmKey}
              setFocusBgmKey={setFocusBgmKey}
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
              characterSectionRef={characterSectionRef}
              inputSectionRef={inputSectionRef}
              sceneSectionRef={sceneSectionRef}
              timelineSectionRef={timelineSectionRef}
              characterMasterRef={characterMasterRef}
              savedScripts={savedScripts}
              savedScriptsSectionRef={savedScriptsSectionRef}
              onSaveScript={handleSaveScript}
              onUpdateScript={handleUpdateScript}
              onDeleteScript={handleDeleteScript}
              scrollToRef={scrollToRef}
              onMenuOpen={() => setSidebarOpen(true)}
            />
          ) : (
            <>
              <Header
                title={viewTitles[currentView]}
                onBackClick={currentView === 'settings' ? () => handleMenuClick('project', 'project') : undefined}
                onMenuOpen={() => setSidebarOpen(true)}
              />
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                  {currentView === 'api-keys' && <ApiKeysManagement />}
                  {currentView === 'settings' && (
                    <SettingsPanel activeTab={settingsTab} onTabChange={setSettingsTab} />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <MobileNav
          activeView={currentView}
          onMenuClick={handleMenuClick}
          onMenuOpen={() => setSidebarOpen(true)}
        />

        <BulkListDrawer
          open={bulkDrawerOpen}
          onClose={() => {
            setBulkDrawerOpen(false);
            setActiveTool((t) => (t === 'bulk-list' ? null : t));
          }}
        />
      </div>
      </VeoModelsProvider>
    </BulkProjectsProvider>
  );
}
