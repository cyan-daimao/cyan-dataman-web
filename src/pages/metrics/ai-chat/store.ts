import { create } from 'zustand';
import { streamMetricAiChat, getConversations, getMessages, deleteConversation as deleteConversationApi } from '@/api/MetricAiChatApi';
import { extractMetricForm, type MetricFormValues } from './types';

// ==================== 类型定义 ====================

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  error?: string;
}

export interface ConversationItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface MetricAiChatState {
  messages: AiChatMessage[];
  conversationId: string;
  isLoading: boolean;
  inputValue: string;
  pendingFormValues: MetricFormValues | null;

  // 历史对话
  conversations: ConversationItem[];
  conversationsLoading: boolean;
  sidebarCollapsed: boolean;

  // actions
  setInputValue: (value: string) => void;
  sendMessage: (query: string) => Promise<void>;
  resetChat: () => void;
  setPendingFormValues: (values: MetricFormValues | null) => void;
  loadConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => void;
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
  pendingFormValues: null,
  conversations: [],
  conversationsLoading: false,
  sidebarCollapsed: false,

  setInputValue: (value: string) => set({ inputValue: value }),

  setPendingFormValues: (values: MetricFormValues | null) => set({ pendingFormValues: values }),

  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),

  resetChat: () => {
    set({ messages: [], conversationId: '', isLoading: false, inputValue: '', pendingFormValues: null });
  },

  loadConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const list = await getConversations(getCurrentUser());
      set({
        conversations: list.map(c => ({
          id: c.id,
          name: c.name || '新对话',
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      });
    } catch {
      // ignore
    } finally {
      set({ conversationsLoading: false });
    }
  },

  loadConversationMessages: async (conversationId: string) => {
    set({ isLoading: true, pendingFormValues: null });
    try {
      const msgs = await getMessages(conversationId, getCurrentUser());
      // Dify 消息是按时间倒序返回的，需要反转
      const reversed = [...msgs].reverse();
      const messages: AiChatMessage[] = [];

      for (const msg of reversed) {
        if (msg.query) {
          messages.push({
            id: generateId(),
            role: 'user',
            content: msg.query,
          });
        }
        if (msg.answer) {
          messages.push({
            id: msg.id || generateId(),
            role: 'assistant',
            content: msg.answer,
            loading: false,
          });
        }
      }

      // 解析最后一条 assistant 消息的 metric_form
      let formValues: MetricFormValues | null = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          formValues = extractMetricForm(messages[i].content);
          break;
        }
      }

      set({
        messages,
        conversationId,
        isLoading: false,
        pendingFormValues: formValues,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  deleteConversation: async (conversationId: string) => {
    const state = get();
    try {
      await deleteConversationApi(conversationId, getCurrentUser());
      const remaining = state.conversations.filter((c) => c.id !== conversationId);
      set({ conversations: remaining });
      // 如果删除的是当前激活的对话，重置聊天
      if (state.conversationId === conversationId) {
        set({ messages: [], conversationId: '', isLoading: false, pendingFormValues: null });
      }
    } catch {
      // ignore
    }
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
      pendingFormValues: null,
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

      // 消息结束：解析 metric_form
      const formValues = extractMetricForm(fullContent);

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
          pendingFormValues: formValues,
        };
      });

      // 如果有新对话 ID，刷新历史对话列表
      if (newConversationId && !state.conversationId) {
        get().loadConversations();
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '请求失败，请稍后重试';
      set((s) => {
        const msgs = [...s.messages];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.loading = false;
          lastMsg.error = errMsg;
        }
        return { messages: msgs, isLoading: false, pendingFormValues: null };
      });
    }
  },
}));
