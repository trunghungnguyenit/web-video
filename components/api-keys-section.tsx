import React from 'react';
import { Eye, EyeOff, Copy, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const ApiKeyCard = ({
  name,
  apiKey,
  status,
  help = false,
}: {
  name: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  help?: boolean;
}) => {
  const statusConfig = {
    connected: {
      color: 'text-success bg-success/10 border-success/30',
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'Hợp lệ',
    },
    disconnected: {
      color: 'text-muted-foreground bg-muted/10 border-muted/30',
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Chưa kết nối',
    },
    error: {
      color: 'text-destructive bg-destructive/10 border-destructive/30',
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'Lỗi',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{name}</h4>
        <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium ${config.color}`}>
          {config.icon}
          {config.label}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey}
          readOnly
          className="flex-1 px-3 py-2 bg-background border border-border rounded text-xs font-mono text-muted-foreground"
        />
        <button className="p-2 hover:bg-card rounded transition-colors">
          <Copy className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="p-2 hover:bg-card rounded transition-colors">
          <Eye className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {help && (
        <div className="text-xs text-muted-foreground">
          Nhập tại đây để sử dụng API key của bạn
        </div>
      )}

      {status === 'error' && (
        <button className="text-xs text-primary hover:text-primary-hover transition-colors">
          Nhập lại
        </button>
      )}
    </div>
  );
};

export function ApiKeysSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-2">6. QUẢN LÝ API KEYS</h2>
        <p className="text-sm text-muted-foreground">
          API keys được dùng để xác thực và sử dụng các dịch vụ AI
        </p>
      </div>

      {/* API Keys Grid */}
      <div className="grid grid-cols-2 gap-4">
        <ApiKeyCard
          name="OpenAI / GPT"
          apiKey="sk.............................."
          status="connected"
        />
        <ApiKeyCard
          name="ElevenLabs"
          apiKey="sk.............................."
          status="connected"
        />
        <ApiKeyCard
          name="Runway ML"
          apiKey="rmk.............................."
          status="disconnected"
          help
        />
        <ApiKeyCard
          name="Kling AI"
          apiKey="kling.............................."
          status="connected"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ApiKeyCard
          name="Whisper / STT"
          apiKey="whisper.............................."
          status="connected"
        />
        <ApiKeyCard
          name="Pika Labs"
          apiKey="pika.............................."
          status="disconnected"
        />
        <ApiKeyCard
          name="Google TTS"
          apiKey="gts.............................."
          status="connected"
        />
        <div className="bg-card border border-dashed border-primary/30 rounded-lg p-4 flex items-center justify-center cursor-pointer hover:bg-card/80 transition-colors">
          <div className="text-center">
            <div className="text-2xl mb-2">🔑</div>
            <p className="text-sm text-primary font-medium">Thêm API khác</p>
            <p className="text-xs text-muted-foreground mt-1">Nhập tại đây API</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-destructive/5 border border-destructive/30 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">API keys được bảo mật</p>
          <p>Chúng tôi sẽ không bao giờ yêu cầu API key của bạn qua email hoặc chat trực tiếp từ đội hỗ trợ của chúng tôi.</p>
        </div>
      </div>
    </div>
  );
}
