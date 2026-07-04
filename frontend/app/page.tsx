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
import { VoiceSpeedPanel } from '@/components/features/voice-speed';
import { SceneStylePanel } from '@/components/features/scene-style';
import { BackgroundMusicPanel } from '@/components/features/background-music';
import { SceneDurationPanel } from '@/components/features/scene-duration';
import { PresetScriptModal } from '@/components/features/preset-script-modal';
import type { QuickActionId } from '@/components/features/quick-actions';
import type { PresetScript, PresetCharacter, PresetInput } from '@/lib/preset-scripts';

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

  // Applied preset data — dùng key trick để force re-render component nhận preset
  const [appliedCharacter, setAppliedCharacter] = useState<PresetCharacter | null>(null);
  const [appliedInput, setAppliedInput] = useState<PresetInput | null>(null);
  const [applyKey, setApplyKey] = useState(0); // increment để trigger useEffect trong children

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
    setActiveTool((prev) => (prev === toolId ? null : toolId));
    setSidebarOpen(false);
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
                {activeTool === 'voice-speed' && <VoiceSpeedPanel onClose={() => setActiveTool(null)} />}
                {activeTool === 'scene-style' && <SceneStylePanel onClose={() => setActiveTool(null)} />}
                {activeTool === 'background-music' && <BackgroundMusicPanel onClose={() => setActiveTool(null)} />}
                {activeQuickAction === 'scene-duration' && (
                  <SceneDurationPanel onClose={() => setActiveQuickAction(null)} />
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
                  />
                </div>

                {/* Section 3 — Scene Gallery */}
                <div ref={sceneSectionRef}>
                  <SceneGallery />
                </div>

                {/* Section 4 — Timeline */}
                <div ref={timelineSectionRef}>
                  <TimelineEditor />
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
