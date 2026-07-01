'use client';

import { ChevronDown, ChevronLeft, Settings } from 'lucide-react';

interface HeaderProps {
  onBackClick?: () => void;
}

export function Header({ onBackClick }: HeaderProps) {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        {onBackClick && (
          <button onClick={onBackClick} className="p-2 hover:bg-card rounded-lg transition-colors text-muted-foreground hover:text-primary">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-foreground">
          {onBackClick ? 'Cài đặt' : 'AI Video Studio'}
        </h1>
        {!onBackClick && (
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card hover:bg-card/80 transition-colors text-sm text-muted-foreground">
            <span>Demo Project</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {!onBackClick && (
        <button className="p-2 hover:bg-card rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <Settings className="w-5 h-5" />
        </button>
      )}
    </header>
  );
}
