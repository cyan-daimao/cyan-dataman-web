import { create } from 'zustand';
import { streamMetricAiChat } from '@/api/MetricAiChatApi';
import { extractMetricDefinition, type MetricDefinitionJSON } from './types';

// ==================== 类型定义 ====================

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  error?: string;
}

export interface MetricAiChatState {
  messages: AiChatMessage[];
  conversationId: string;
  isLoading: boolean;
  inputValue: string;
  pendingDefinition: MetricDefinitionJSON | null;
  isCreating: boolean;

  // actions
  setInputValue: (value: string) => void;
  sendMessage: (query: string) => Promise<void>;
  resetChat: () => void;
  setPendingDefinition: (def: MetricDefinitionJSON | null) => void;
  setIsCreating: (value: boolean) => void;
}

// ==================== 工具函数 ====================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getCurrentUser(): string {
  try {
    const current = localStorage.getItem('current');
    if (current) {
      const parsed = JSON.parse(current);
      return parsed.passport || parsed.id || 'anonymous';
    }
  } catch {
    // ignore
  }
  return 'anonymous';
}

// ==================== Zustand Store ====================

export const useMetricAiChatStore = create<MetricAiChatState>((set, get) => ({
  messages: [],
  conversationId: '',
  isLoading: false,
  inputValue: '',
  pendingDefinition: null,
  isCreating: false,

  setInputValue: (value: string) => set({ inputValue: value }),

  setPendingDefinition: (def: MetricDefinitionJSON | null) => set({ pendingDefinition: def }),

  setIsCreating: (value: boolean) => set({ isCreating: value }),

  resetChat: () => {
    set({ messages: [], conversationId: '', isLoading: false, inputValue: '', pendingDefinition: null, isCreating: false });
  },

  sendMessage: async (query: string) => {
    const state = get();
    if (state.isLoading || !query.trim()) return;

    // 添加用户消息
    const userMsg: AiChatMessage = {
      id: generateId(),
      role: 'user',
      content: query.trim(),
    };

    // 添加 AI 占位消息（loading）
    const assistantMsg: AiChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      loading: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isLoading: true,
      inputValue: '',
      pendingDefinition: null,
    }));

    let fullContent = '';
    let newConversationId = state.conversationId;

    try {
      const stream = streamMetricAiChat({
        query: query.trim(),
        conversationId: state.conversationId,
        user: getCurrentUser(),
      });

      for await (const event of stream) {
        // 更新 conversation_id
        if (event.conversation_id && !newConversationId) {
          newConversationId = event.conversation_id;
        }

        if (event.event === 'agent_message' && typeof event.answer === 'string') {
          fullContent += event.answer;
          set((s) => {
            const msgs = [...s.messages];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = fullContent;
            }
            return { messages: msgs };
          });
        } else if (event.event === 'message_end') {
          break;
        } else if (event.event === 'error') {
          throw new Error((event as Record<string, string>).error || 'Dify 请求出错');
        }
      }

      // 消息结束：解析 metric_definition
      const definition = extractMetricDefinition(fullContent);

      set((s) => {
        const msgs = [...s.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.loading = false;
        }
        return {
          messages: msgs,
          conversationId: newConversationId,
          isLoading: false,
          pendingDefinition: definition,
        };
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '请求失败，请稍后重试';
      set((s) => {
        const msgs = [...s.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.loading = false;
          lastMsg.error = errMsg;
        }
        return { messages: msgs, isLoading: false, pendingDefinition: null };
      });
    }
  },
}));
