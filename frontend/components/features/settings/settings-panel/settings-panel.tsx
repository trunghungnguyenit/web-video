'use client';

import { Settings, Key, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeneralSettings } from '../general-settings';
import { KeySetupSettings } from '../key-setup-settings';
import { ApiKeysSettings } from '../api-keys-settings';
import { RenderHistorySettings } from '../render-history-settings';

interface Tab {
  id: string;
  label: string;
  icon: typeof Settings;
  desc: string;
}

const settingsTabs: Tab[] = [
  { id: 'general', label: 'Cài đặt chung',   icon: Settings, desc: 'Ngôn ngữ, theme, tài khoản' },
  { id: 'key',     label: 'License & Key',    icon: Key,      desc: 'License key, OpenAI API' },
  { id: 'api',     label: 'API Keys',         icon: Shield,   desc: 'Kết nối dịch vụ AI' },
  { id: 'history', label: 'Lịch sử render',   icon: Clock,    desc: 'Video đã xuất' },
];

interface SettingsPanelProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsPanel({ activeTab, onTabChange }: SettingsPanelProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
      {/* Tab nav — horizontal on mobile, vertical sidebar on sm+ */}
      <nav className="w-full sm:w-44 lg:w-52 flex-shrink-0 sm:sticky sm:top-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2 hidden sm:block">
          Cài đặt
        </p>
        {/* Mobile: horizontal scroll tabs */}
        <div className="flex sm:flex-col gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer whitespace-nowrap sm:whitespace-normal flex-shrink-0 sm:flex-shrink sm:w-full',
                  isActive
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                )}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="min-w-0">
                  <span className={cn('block text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>
                    {tab.label}
                  </span>
                  <span className="hidden sm:block text-[10px] text-muted-foreground/70 truncate">{tab.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 w-full">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'key'     && <KeySetupSettings />}
        {activeTab === 'api'     && <ApiKeysSettings />}
        {activeTab === 'history' && <RenderHistorySettings />}
      </div>
    </div>
  );
}
