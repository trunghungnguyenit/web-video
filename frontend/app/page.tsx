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
import type { QuickActionId } from '@/components/features/quick-actions';
import type { PresetScript, PresetCharacter, PresetInput } from '@/lib/preset-scripts';
import type { SavedScript } from '@/lib/saved-scripts';
import { generateScriptId, deriveTitle } from '@/lib/saved-scripts';

const viewTitles: Record<AppView, string> = {
  project: 'AI Video Studio',
  'api-keys': 'API Keys',
  settings: 'Cài đặt',
};

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>('project');
  const [activeMenuId, setActiveMenuId] = useState('project');
  const [activeTool, setActiveTool] = useState<CreativeToolId | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<QuickActionId | null>(null);
  const [settingsTab, setSettingsTab] = useState('general');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Preset modal state
  const [selectedPreset, setSelectedPreset] = useState<PresetScript | null>(null);

  // Saved scripts
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const savedScriptsSectionRef = useRef<HTMLDivElement>(null);

  // Applied preset data — dùng key trick để force re-render component nhận preset
  const [appliedCharacter, setAppliedCharacter] = useState<PresetCharacter | null>(null);
  const [appliedInput, setAppliedInput] = useState<PresetInput | null>(null);
  const [applyKey, setApplyKey] = useState(0); // increment để trigger useEffect trong children

  // Focus tool keys — tăng số để trigger useEffect trong con
  // (mỗi lần user click sidebar → key thay đổi → useEffect fire lại)
  const [focusVoiceSpeedKey, setFocusVoiceSpeedKey] = useState(0);
  const [focusSceneStyleKey, setFocusSceneStyleKey] = useState(0);
  const [focusContentKey,    setFocusContentKey]    = useState(0);
  const [focusBgmKey,        setFocusBgmKey]        = useState(0);

  // Ref để scroll đến từng section
  const characterSectionRef = useRef<HTMLDivElement>(null);
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const sceneSectionRef = useRef<HTMLDivElement>(null);
  const timelineSectionRef = useRef<HTMLDivElement>(null);

  // Ref để gọi applyPreset trực tiếp qua CharacterMasterHandle
  const characterMasterRef = useRef<CharacterMasterHandle>(null);

  const scrollToRef = useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Saved Scripts handlers ────────────────────────────────────────────────

  const handleSaveScript = useCallback((
    content: string,
    meta: { language: string; duration: string; videoType: string; voice: string },
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
    // Scroll xuống section kịch bản đã lưu
    setTimeout(() => savedScriptsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, []);

  const handleUpdateScript = useCallback((updated: SavedScript) => {
    setSavedScripts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleDeleteScript = useCallback((id: string) => {
    setSavedScripts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleApplySavedScript = useCallback((script: SavedScript) => {
    // Apply vào InputSection qua state
    setAppliedInput({
      content: script.content,
      language: script.meta.language,
      duration: script.meta.duration,
      videoType: script.meta.videoType,
      voice: script.meta.voice,
    });
    setApplyKey((k) => k + 1);
    // Scroll về Input section
    setTimeout(() => scrollToRef(inputSectionRef), 100);
  }, [scrollToRef]);

  // ── Menu / navigation handlers ────────────────────────────────────────────

  const handleMenuClick = (menuId: string, view: AppView) => {
    setActiveMenuId(menuId);
    setCurrentView(view);
    setSidebarOpen(false);
    if (view !== 'project') {
      setActiveTool(null);
      setActiveQuickAction(null);
    }
  };

  const handleToolClick = (toolId: CreativeToolId) => {
    setCurrentView('project');
    setActiveMenuId('project');
    setActiveQuickAction(null);
    setSidebarOpen(false);

    // Chỉ toggle activeTool cho SceneDurationPanel (panel duy nhất render ngoài section)
    if (toolId === 'scene-duration') {
      setActiveTool((prev) => (prev === 'scene-duration' ? null : 'scene-duration'));
    } else {
      setActiveTool(null);
    }

    switch (toolId) {
      // ── Điều hướng: chỉ scroll đến section ──────────────────────────────
      case 'character':
        setTimeout(() => scrollToRef(characterSectionRef), 50);
        break;
      case 'content':
        setFocusContentKey((k) => k + 1); // sẽ focus vào textarea
        setTimeout(() => scrollToRef(inputSectionRef), 50);
        break;
      case 'scene-gallery':
        setTimeout(() => scrollToRef(sceneSectionRef), 50);
        break;
      case 'timeline':
        setTimeout(() => scrollToRef(timelineSectionRef), 50);
        break;

      // ── Tùy chỉnh: scroll + mở panel/accordion ──────────────────────────
      case 'voice-speed':
        setFocusVoiceSpeedKey((k) => k + 1);
        setTimeout(() => scrollToRef(inputSectionRef), 50);
        break;
      case 'scene-style':
        setFocusSceneStyleKey((k) => k + 1);
        setTimeout(() => scrollToRef(inputSectionRef), 50);
        break;
      case 'scene-duration':
        setTimeout(() => scrollToRef(sceneSectionRef), 50);
        break;
      case 'background-music':
        setFocusBgmKey((k) => k + 1); // expand BGM panel trong Timeline
        setTimeout(() => scrollToRef(timelineSectionRef), 50);
        break;
    }
  };

  const handleQuickActionClick = useCallback((actionId: QuickActionId) => {
    setCurrentView('project');
    setActiveMenuId('project');
    switch (actionId) {
      case 'analyze':
        setActiveQuickAction('analyze');
        setTimeout(() => {
          scrollToRef(inputSectionRef);
          inputSectionRef.current?.querySelector('textarea')?.focus();
        }, 50);
        break;
      case 'script':
        setActiveQuickAction('script');
        setTimeout(() => scrollToRef(inputSectionRef), 50);
        break;
      case 'split':
        setActiveQuickAction('split');
        setTimeout(() => scrollToRef(sceneSectionRef), 50);
        break;
      case 'scene-duration':
        setActiveTool(null);
        setActiveQuickAction((prev) => (prev === 'scene-duration' ? null : 'scene-duration'));
        break;
      case 'generate':
        setActiveQuickAction('generate');
        setTimeout(() => scrollToRef(sceneSectionRef), 50);
        break;
      case 'render':
        setActiveQuickAction('render');
        setTimeout(() => {
          scrollToRef(timelineSectionRef);
          timelineSectionRef.current?.querySelector<HTMLButtonElement>('button[data-render]')?.focus();
        }, 50);
        break;
      default:
        setActiveQuickAction(actionId);
    }
  }, [scrollToRef]);

  // Khi user click kịch bản mẫu trong sidebar → mở modal preview
  const handlePresetSelect = (preset: PresetScript) => {
    // Chuyển về màn project trước
    setCurrentView('project');
    setActiveMenuId('project');
    setSidebarOpen(false);
    setSelectedPreset(preset);
  };

  // Khi user nhấn "Áp dụng kịch bản" trong modal
  const handlePresetApply = (preset: PresetScript) => {
    // Đóng modal
    setSelectedPreset(null);

    // Apply vào CharacterMaster qua ref (instant, không cần key trick)
    characterMasterRef.current?.applyPreset(preset.character);

    // Apply vào InputSection qua state + key increment để trigger useEffect
    setAppliedCharacter(preset.character);
    setAppliedInput(preset.input);
    setApplyKey((k) => k + 1);

    // Scroll về đầu trang (section 1)
    setTimeout(() => scrollToRef(characterSectionRef), 100);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
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

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          title={viewTitles[currentView]}
          showQuickActions={currentView === 'project'}
          activeQuickAction={activeQuickAction}
          onQuickActionClick={handleQuickActionClick}
          onBackClick={
            currentView === 'settings'
              ? () => handleMenuClick('project', 'project')
              : undefined
          }
          onMenuOpen={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-8 pb-24 md:pb-6">
            {currentView === 'project' && (
              <>
                {activeTool === 'scene-duration' && (
                  <SceneDurationPanel onClose={() => setActiveTool(null)} />
                )}

                {/* Section 1 — Character */}
                <div ref={characterSectionRef}>
                  <CharacterMaster ref={characterMasterRef} />
                </div>

                {/* Section 2 — Input */}
                <div ref={inputSectionRef}>
                  <InputSection
                    activeQuickAction={activeQuickAction}
                    onActionDone={() => setActiveQuickAction(null)}
                    presetData={appliedInput}
                    presetKey={applyKey}
                    onSaveScript={handleSaveScript}
                    focusVoiceSpeedKey={focusVoiceSpeedKey}
                    focusSceneStyleKey={focusSceneStyleKey}
                    focusContentKey={focusContentKey}
                  />
                </div>

                {/* Section 2.5 — Kịch bản đã lưu */}
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
                        onUpdate={handleUpdateScript}
                        onDelete={handleDeleteScript}
                      />
                    </section>
                  </div>
                )}

                {/* Section 3 — Scene Gallery */}
                <div ref={sceneSectionRef}>
                  <SceneGallery />
                </div>

                {/* Section 4 — Timeline */}
                <div ref={timelineSectionRef}>
                  <TimelineEditor focusBgmKey={focusBgmKey} />
                </div>
              </>
            )}

            {currentView === 'api-keys' && <ApiKeysManagement />}
            {currentView === 'settings' && (
              <SettingsPanel activeTab={settingsTab} onTabChange={setSettingsTab} />
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        activeView={currentView}
        onMenuClick={handleMenuClick}
        onMenuOpen={() => setSidebarOpen(true)}
      />

      {/* Preset Script Modal */}
      <PresetScriptModal
        preset={selectedPreset}
        onClose={() => setSelectedPreset(null)}
        onApply={handlePresetApply}
      />
    </div>
  );
}
