import { MetricBiAnalysisCmd } from './DatabiApi';

const DIFY_BASE_URL = 'http://10.0.0.2:20080';
const DIFY_API_KEY = 'app-lI3162I3aXSc1jrkjIa4y7PN';

export interface DifyStreamEvent {
  event: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  data?: unknown;
  error?: string;
  status?: number;
  code?: string;
}

export interface ChatMessageRequest {
  query: string;
  conversationId: string;
  user: string;
}

/**
 * SSE 流式调用 Dify Chat API
 */
export async function* streamChatMessage(
  request: ChatMessageRequest
): AsyncGenerator<DifyStreamEvent> {
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

const DSL_MARK_REGEX = /\[DSL\]\s*([\s\S]*?)\s*\[\/DSL\]/;
const CODE_BLOCK_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/g;

/**
 * 从 AI 回复内容中提取 DSL JSON
 * 支持两种格式：
 * 1. [DSL]{...}[/DSL] 标记
 * 2. Markdown 代码块中的 JSON（```json...``` 或 ```...```）
 */
export function parseDslFromContent(content: string): MetricBiAnalysisCmd | null {
  // 先尝试匹配 [DSL] 标记
  const markMatch = content.match(DSL_MARK_REGEX);
  if (markMatch) {
    try {
      return JSON.parse(markMatch[1].trim());
    } catch {
      // 忽略解析错误，继续尝试其他格式
    }
  }

  // 再尝试匹配 Markdown 代码块中的 JSON
  // 策略：遍历所有代码块，尝试解析，找到第一个有效的 MetricBiAnalysisCmd
  const codeMatches = content.matchAll(CODE_BLOCK_REGEX);
  for (const match of codeMatches) {
    const jsonStr = match[1].trim();
    try {
      const parsed = JSON.parse(jsonStr);
      // 简单校验：必须有 chartType 和 metrics 字段
      if (parsed && typeof parsed.chartType === 'string' && Array.isArray(parsed.metrics)) {
        return parsed as MetricBiAnalysisCmd;
      }
    } catch {
      // 继续尝试下一个代码块
    }
  }

  // 最后尝试从整个内容中直接提取 JSON（兜底）
  // 匹配最外层的大括号对象
  const jsonMatch = content.match(/\{[\s\S]*"chartType"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && typeof parsed.chartType === 'string' && Array.isArray(parsed.metrics)) {
        return parsed as MetricBiAnalysisCmd;
      }
    } catch {
      // 忽略
    }
  }

  return null;
}

/**
 * 清理 AI 回复内容（移除 DSL 标记块和代码块）
 */
export function cleanContent(content: string): string {
  return content
    .replace(DSL_MARK_REGEX, '')
    .replace(CODE_BLOCK_REGEX, '')
    .trim();
}
