'use client';

import { Settings, Key, Clock } from 'lucide-react';
import { GeneralSettings } from '../general-settings';
import { KeySetupSettings } from '../key-setup-settings';
import { ApiKeysSettings } from '../api-keys-settings';
import { RenderHistorySettings } from '../render-history-settings';

interface SettingsPanelProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const settingsTabs = [
  { id: 'general', label: 'Cài đặt chung', icon: Settings },
  { id: 'key', label: 'Cài Đặt Key', icon: Key },
  { id: 'api', label: 'Quản lý API Keys', icon: Key },
  { id: 'history', label: 'Lịch sử render', icon: Clock },
];

export function SettingsPanel({ activeTab, onTabChange }: SettingsPanelProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-primary uppercase tracking-widest px-2">CÀI ĐẶT</h3>
        <div className="space-y-1">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-sidebar-accent hover:text-primary hover:bg-sidebar-accent/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'key' && <KeySetupSettings />}
        {activeTab === 'api' && <ApiKeysSettings />}
        {activeTab === 'history' && <RenderHistorySettings />}
      </div>
    </div>
  );
}
