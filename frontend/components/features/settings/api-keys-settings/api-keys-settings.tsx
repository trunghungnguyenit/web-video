export function ApiKeysSettings() {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-4">Quản lý API Keys</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Quản lý và cấu hình các API keys cho các dịch vụ bên ngoài
        </p>
      </div>

      <div className="space-y-3">
        {[
          { name: 'OpenAI / GPT', connected: true, desc: 'Cho text generation và AI tasks' },
          { name: 'ElevenLabs', connected: true, desc: 'Cho voice synthesis' },
          { name: 'Runway ML', connected: false, desc: 'Cho video generation' },
          { name: 'Google Cloud', connected: false, desc: 'Cho TTS và APIs khác' },
        ].map((api) => (
          <div key={api.name} className="flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="flex-1">
              <h5 className="text-sm font-medium text-foreground">{api.name}</h5>
              <p className="text-xs text-muted-foreground">{api.desc}</p>
            </div>
            <button
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                api.connected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-border hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border'
              }`}
            >
              {api.connected ? 'Đã kết nối' : 'Kết nối'}
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-6">
        <button className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition-colors">
          + Thêm API Key
        </button>
      </div>
    </div>
  );
}
