'use client';

import { useState } from 'react';
import { Sidebar, type AppView, type CreativeToolId } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { InputSection } from '@/components/features/input-section';
import { CharacterMaster } from '@/components/features/character-master';
import { SceneGallery } from '@/components/features/scene-gallery';
import { TimelineEditor } from '@/components/features/timeline-editor';
import { ApiKeysManagement } from '@/components/features/api-keys-management';
import { SettingsPanel } from '@/components/features/settings/settings-panel';
import { VoiceSpeedPanel } from '@/components/features/voice-speed';
import { SceneStylePanel } from '@/components/features/scene-style';
import { BackgroundMusicPanel } from '@/components/features/background-music';
import { SceneDurationPanel } from '@/components/features/scene-duration';
import type { QuickActionId } from '@/components/features/quick-actions';

const viewTitles: Record<AppView, string> = {
  project: 'AI Video Studio',
  'api-keys': 'Quản lý API Keys',
  settings: 'Cài đặt',
};

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>('project');
  const [activeMenuId, setActiveMenuId] = useState('project');
  const [activeTool, setActiveTool] = useState<CreativeToolId | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<QuickActionId | null>(null);
  const [settingsTab, setSettingsTab] = useState('general');

  const handleMenuClick = (menuId: string, view: AppView) => {
    setActiveMenuId(menuId);
    setCurrentView(view);
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
  };

  const handleQuickActionClick = (actionId: QuickActionId) => {
    if (actionId === 'scene-duration') {
      setActiveTool(null);
      setActiveQuickAction((prev) => (prev === actionId ? null : actionId));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        activeView={currentView}
        activeMenuId={activeMenuId}
        activeTool={activeTool}
        onMenuClick={handleMenuClick}
        onToolClick={handleToolClick}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={viewTitles[currentView]}
          showQuickActions={currentView === 'project'}
          activeQuickAction={activeQuickAction}
          onQuickActionClick={handleQuickActionClick}
          onBackClick={currentView === 'settings' ? () => handleMenuClick('project', 'project') : undefined}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8 space-y-16">
            {currentView === 'project' && (
              <>
                {activeTool === 'voice-speed' && (
                  <VoiceSpeedPanel onClose={() => setActiveTool(null)} />
                )}
                {activeTool === 'scene-style' && (
                  <SceneStylePanel onClose={() => setActiveTool(null)} />
                )}
                {activeTool === 'background-music' && (
                  <BackgroundMusicPanel onClose={() => setActiveTool(null)} />
                )}
                {activeQuickAction === 'scene-duration' && (
                  <SceneDurationPanel onClose={() => setActiveQuickAction(null)} />
                )}
                <CharacterMaster />
                <InputSection />
                <SceneGallery />
                <TimelineEditor />
              </>
            )}

            {currentView === 'api-keys' && <ApiKeysManagement />}

            {currentView === 'settings' && (
              <SettingsPanel activeTab={settingsTab} onTabChange={setSettingsTab} />
            )}

            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
