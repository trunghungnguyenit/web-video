'use client';

import { useState, useCallback } from 'react';
import { ImageIcon, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneToolbar } from './scene-toolbar';

type SceneStatus = 'success' | 'error' | 'generating';

interface Scene {
  id: number;
  time: string;
  prompt: string;
  voice: string;
  duration: string;
  status: SceneStatus;
}

const initialScenes: Scene[] = [
  { id: 1, time: '00:00 - 00:05', prompt: 'A man stands at the entrance of a dark cave...', voice: 'He discovers ancient drawings inside', duration: '5.0s', status: 'success' },
  { id: 2, time: '00:05 - 00:11', prompt: 'The man holds a lantern and explores...', voice: 'The cave walls glow with mysterious light', duration: '6.0s', status: 'error' },
  { id: 3, time: '00:11 - 00:17', prompt: 'A mysterious creature walks by...', voice: 'He hears a strange sound and shivers', duration: '6.0s', status: 'success' },
  { id: 4, time: '00:17 - 00:23', prompt: 'The man climbs up a stone ladder...', voice: 'Finally reaching the surface', duration: '6.0s', status: 'success' },
  { id: 5, time: '00:23 - 00:28', prompt: 'Sunlight floods the cave entrance...', voice: 'The adventure comes to an end', duration: '5.0s', status: 'error' },
  { id: 6, time: '00:28 - 00:33', prompt: 'The man looks back at the cave...', voice: 'Ready for the next exploration', duration: '5.0s', status: 'success' },
  { id: 7, time: '00:33 - 00:39', prompt: 'Ancient symbols shine brightly...', voice: 'The mystery deepens', duration: '6.0s', status: 'success' },
  { id: 8, time: '00:39 - 00:45', prompt: 'A hidden door appears...', voice: 'Another passage awaits', duration: '6.0s', status: 'success' },
  { id: 9, time: '00:45 - 00:51', prompt: 'The character enters hesitantly...', voice: 'What lies ahead?', duration: '6.0s', status: 'error' },
  { id: 10, time: '00:51 - 00:59', prompt: 'Final scene with dramatic lighting...', voice: 'To be continued...', duration: '8.0s', status: 'success' },
];

function StatusBadge({ status }: { status: SceneStatus }) {
  if (status === 'error') {
    return (
      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-destructive/90 rounded text-[10px] font-medium text-white">
        <AlertCircle className="w-3 h-3" />
        Lỗi
      </span>
    );
  }
  if (status === 'generating') {
    return (
      <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-primary/90 rounded text-[10px] font-medium text-white">
        <Loader2 className="w-3 h-3 animate-spin" />
        Đang gen...
      </span>
    );
  }
  return (
    <span className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-green-600/90 rounded text-[10px] font-medium text-white">
      <CheckCircle2 className="w-3 h-3" />
      OK
    </span>
  );
}

export function SceneGallery() {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const errorScenes = scenes.filter((s) => s.status === 'error');
  const allSelected = selectedIds.length === scenes.length && scenes.length > 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleScene = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const regenerateScenes = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;

    setIsRegenerating(true);
    setScenes((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'generating' as const } : s)),
    );

    await new Promise((r) => setTimeout(r, 1500));

    setScenes((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, status: 'success' as const } : s)),
    );
    setIsRegenerating(false);
    showToast(`Đã gen lại ${ids.length} cảnh thành công`);
  }, []);

  const handleSceneAction = (action: string) => {
    if (action === 'regen-error') {
      const targets =
        selectedIds.length > 0
          ? scenes.filter((s) => selectedIds.includes(s.id) && s.status === 'error').map((s) => s.id)
          : errorScenes.map((s) => s.id);

      if (targets.length === 0) {
        showToast('Không có cảnh lỗi nào để gen lại');
        return;
      }
      regenerateScenes(targets);
      return;
    }

    if (action === 'delete' && selectedIds.length > 0) {
      setScenes((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      showToast(`Đã xóa ${selectedIds.length} cảnh`);
    }
  };

  const handleBulkAction = (action: string) => {
    if (action === 'select-all') {
      setSelectedIds(scenes.map((s) => s.id));
      showToast(`Đã chọn tất cả ${scenes.length} cảnh`);
      return;
    }
    if (action === 'deselect-all') {
      setSelectedIds([]);
      return;
    }
    if (action === 'delete-bulk' && selectedIds.length > 0) {
      setScenes((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      showToast(`Đã xóa ${selectedIds.length} cảnh`);
      setSelectedIds([]);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest">
          3. DANH SÁCH CẢNH ({scenes.length})
        </h2>
        {toast && (
          <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full animate-in fade-in">
            {toast}
          </span>
        )}
      </div>

      <SceneToolbar
        selectedCount={selectedIds.length}
        totalCount={scenes.length}
        errorCount={errorScenes.length}
        allSelected={allSelected}
        isRegenerating={isRegenerating}
        onSceneAction={handleSceneAction}
        onBulkAction={handleBulkAction}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {scenes.map((scene) => {
          const isSelected = selectedIds.includes(scene.id);
          const isError = scene.status === 'error';

          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => toggleScene(scene.id)}
              className={cn(
                'text-left bg-card border rounded-lg overflow-hidden transition-colors',
                isSelected
                  ? 'border-primary ring-1 ring-primary/40'
                  : isError
                    ? 'border-destructive/50 hover:border-destructive'
                    : 'border-border hover:border-primary/50',
              )}
            >
              <div className="w-full aspect-[4/3] bg-muted relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <ImageIcon className={cn('w-12 h-12', isError ? 'text-destructive/50' : 'text-muted-foreground')} />

                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {scene.id}
                </div>

                <div className="absolute top-2 right-2 text-xs font-semibold bg-background/80 px-2 py-1 rounded text-foreground">
                  {scene.time.split(' - ')[1]}
                </div>

                <StatusBadge status={scene.status} />

                {isSelected && (
                  <div className="absolute bottom-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Video Prompt</p>
                  <p className="text-xs text-foreground line-clamp-2">{scene.prompt}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Voice (TTS)</p>
                  <p className="text-xs text-foreground line-clamp-1">{scene.voice}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{scene.duration}</span>
                  {isError && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        regenerateScenes([scene.id]);
                      }}
                      disabled={isRegenerating}
                      className="text-[10px] text-orange-400 hover:text-orange-300 font-medium disabled:opacity-50"
                    >
                      Gen lại
                    </button>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
