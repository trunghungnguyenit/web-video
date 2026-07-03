export function RenderHistorySettings() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">Lịch sử render</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Xem lịch sử các video đã render
        </p>
      </div>

      <div className="space-y-2">
        {[
          { id: 1, name: 'Video_Demo_01.mp4', date: '2024-01-15 14:30', status: 'completed', size: '245 MB' },
          { id: 2, name: 'Product_Showcase.mp4', date: '2024-01-14 10:15', status: 'completed', size: '198 MB' },
          { id: 3, name: 'Tutorial_Part1.mp4', date: '2024-01-13 16:45', status: 'failed', size: '-' },
          { id: 4, name: 'Marketing_Video.mp4', date: '2024-01-12 09:20', status: 'completed', size: '512 MB' },
          { id: 5, name: 'Social_Media_Reel.mp4', date: '2024-01-11 15:00', status: 'completed', size: '87 MB' },
        ].map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-primary/30 transition-colors group">
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-medium text-foreground truncate">{item.name}</h5>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{item.date}</span>
                <span className="text-xs text-muted-foreground">{item.size}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-destructive/20 text-destructive'
                }`}
              >
                {item.status === 'completed' ? 'Hoàn tất' : 'Lỗi'}
              </span>
              <button className="px-2 py-1 text-xs text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                ⋮
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Tổng dung lượng: 1.2 GB / 10 GB</span>
        <button className="text-xs text-destructive hover:text-destructive/80 transition-colors">
          Xóa tất cả
        </button>
      </div>
    </div>
  );
}
