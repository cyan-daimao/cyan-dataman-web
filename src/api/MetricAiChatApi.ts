import { getBaseURL } from './Request';

const DIFY_BASE_URL = getBaseURL('dify');
const DIFY_API_KEY = 'app-dyanhmRAxHAfs91XUX97KhB8';

export interface MetricAiChatStreamEvent {
  event: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  data?: unknown;
  error?: string;
  status?: number;
  code?: string;
}

export interface MetricAiChatRequest {
  query: string;
  conversationId: string;
  user: string;
}

/**
 * SSE 流式调用 Dify Chat API（指标创建 Agent）
 */
export async function* streamMetricAiChat(
  request: MetricAiChatRequest
): AsyncGenerator<MetricAiChatStreamEvent> {
  const response = await fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {},
      query: request.query,
      response_mode: 'streaming',
      conversation_id: request.conversationId,
      user: request.user,
      files: [],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dify API error: ${response.status} ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        yield JSON.parse(jsonStr);
      } catch {
        // 忽略解析失败的行
      }
    }
  }
}