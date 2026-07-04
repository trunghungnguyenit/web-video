import { apiService } from './api';

export interface HelloResponse {
  message: string;
  time: string;
}

export interface EchoPayload {
  text: string;
}

export interface EchoResponse {
  message: string;
  length: number;
}

class ExampleService {
  /** GET /api/example — kiểm tra backend hoạt động */
  async hello(): Promise<HelloResponse> {
    const res = await apiService.get('/api/example');
    return (res as { data?: HelloResponse })?.data ?? (res as HelloResponse);
  }

  /** POST /api/example — gửi text, backend trả lại */
  async echo(payload: EchoPayload): Promise<EchoResponse> {
    const res = await apiService.post('/api/example', payload);
    return (res as { data?: EchoResponse })?.data ?? (res as EchoResponse);
  }
}

export const exampleService = new ExampleService();
