'use client';

import { Zap, PenTool, Split, Sparkles, Video } from 'lucide-react';

const actions = [
  { icon: Zap, label: 'Phân tích nội dung', color: 'bg-yellow-500/20 text-yellow-400' },
  { icon: PenTool, label: 'Viết kịch bản', color: 'bg-green-500/20 text-green-400' },
  { icon: Split, label: 'Chia cảnh', color: 'bg-blue-500/20 text-blue-400' },
  { icon: Sparkles, label: 'Tạo video & voice', color: 'bg-purple-500/20 text-purple-400' },
  { icon: Video, label: 'Render', color: 'bg-cyan-500/20 text-cyan-400' },
];

export function QuickActions() {
  return (
    <section className="space-y-6">
      <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
        2. THANH CHỨC NĂNG NHANH
      </h2>

      <div className="flex gap-3 flex-wrap">
        {actions.map((action, idx) => (
          <button
            key={idx}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/50 hover:border-primary/50 transition-all ${action.color} font-medium text-sm`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
