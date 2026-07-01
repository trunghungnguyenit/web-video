'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { InputSection } from '@/components/input-section';
import { QuickActions } from '@/components/quick-actions';
import { CharacterMaster } from '@/components/character-master';
import { SceneGallery } from '@/components/scene-gallery';
import { TimelineEditor } from '@/components/timeline-editor';
import { ApiKeysManagement } from '@/components/api-keys-management';
import { SettingsPanel } from '@/components/settings-panel';

export default function Page() {
  const [currentView, setCurrentView] = useState<'main' | 'settings'>('main');
  const [settingsTab, setSettingsTab] = useState('general');

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar onSettingsClick={() => setCurrentView('settings')} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onBackClick={currentView === 'settings' ? () => setCurrentView('main') : undefined} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8 space-y-16">
            {currentView === 'main' ? (
              <>
                {/* Section 1: Input Section */}
                <InputSection />

                {/* Section 2: Quick Actions */}
                <QuickActions />

                {/* Section 3: Character Master */}
                <CharacterMaster />

                {/* Section 4: Scene Gallery */}
                <SceneGallery />

                {/* Section 5: Timeline Editor */}
                <TimelineEditor />

                {/* Section 6: API Keys Management */}
                <ApiKeysManagement />
              </>
            ) : (
              <SettingsPanel activeTab={settingsTab} onTabChange={setSettingsTab} />
            )}

            {/* Bottom Padding */}
            <div className="h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
