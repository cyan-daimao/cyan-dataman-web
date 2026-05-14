import { create } from 'zustand';
import {
  ChartDataDTO,
  ChartType,
  FilterOperator,
  MetricBiAnalysisCmd,
  MetricRef,
  DimensionRef,
  FilterRef,
  OrderRef,
} from '@/api/DatabiApi';
import { metricBiApi } from '@/api/MetricBiApi';
import { streamChatMessage, parseDslFromContent, cleanContent } from '@/api/ChatBIApi';

// ==================== 类型定义 ====================

export interface QueryLogicItem {
  label: string;
  value: string;
}

export interface QueryLogic {
  metrics: QueryLogicItem[];
  dimensions: QueryLogicItem[];
  filters: QueryLogicItem[];
  orders: QueryLogicItem[];
  limit?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  queryLogic?: QueryLogic;
  chartData?: ChartDataDTO;
  chartType?: ChartType;
  sql?: string;
  dsl?: MetricBiAnalysisCmd;
  saveable?: boolean;
  loading?: boolean;
  error?: string;
}

/** 一条对话记录 */
export interface Conversation {
  id: string;
  title: string;
  conversationId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ==================== localStorage 工具 ====================

const STORAGE_KEY = 'chatbi_conversations';
const ACTIVE_KEY = 'chatbi_active_conversation_id';

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveConversations(convs: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch { /* ignore */ }
}

function loadActiveId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) || '';
  } catch { /* ignore */ }
  return '';
}

function saveActiveId(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch { /* ignore */ }
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

/** 从消息中提取对话标题（取第一条用户消息的前 20 字） */
function extractTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    const text = firstUserMsg.content.trim();
    return text.length > 20 ? text.slice(0, 20) + '...' : text;
  }
  return '新对话';
}

/**
 * 将字符串 operator 映射为 FilterOperator 枚举
 */
function normalizeOperator(op: string): FilterOperator {
  const map: Record<string, FilterOperator> = {
    '=': FilterOperator.EQ,
    '!=': FilterOperator.NE,
    '>': FilterOperator.GT,
    '>=': FilterOperator.GTE,
    '<': FilterOperator.LT,
    '<=': FilterOperator.LTE,
    'IN': FilterOperator.IN,
    'LIKE': FilterOperator.LIKE,
    'EQ': FilterOperator.EQ,
    'NE': FilterOperator.NE,
    'GT': FilterOperator.GT,
    'GTE': FilterOperator.GTE,
    'LT': FilterOperator.LT,
    'LTE': FilterOperator.LTE,
    'NOT_IN': FilterOperator.NOT_IN,
    'IS_NULL': FilterOperator.IS_NULL,
    'IS_NOT_NULL': FilterOperator.IS_NOT_NULL,
    'BETWEEN': FilterOperator.BETWEEN,
    'NOT_LIKE': FilterOperator.NOT_LIKE,
  };
  return map[op] || FilterOperator.EQ;
}

/**
 * 规范化 DSL
 */
function normalizeDsl(dsl: Record<string, unknown>): MetricBiAnalysisCmd | null {
  try {
    const chartType = (dsl.chartType as string) || 'TABLE';
    const metrics = ((dsl.metrics as Array<Record<string, unknown>>) || []).map((m) => ({
      metricCode: (m.metricCode as string) || '',
      alias: (m.alias as string) || undefined,
      metricName: (m.metricName as string) || undefined,
    })) as MetricRef[];
    const dimensions = ((dsl.dimensions as Array<Record<string, unknown>>) || []).map((d) => ({
      dimCode: (d.dimCode as string) || '',
      alias: (d.alias as string) || undefined,
      dimName: (d.dimName as string) || undefined,
    })) as DimensionRef[];
    const filters = ((dsl.filters as Array<Record<string, unknown>>) || []).map((f) => ({
      metricCode: (f.metricCode as string) || undefined,
      dimCode: (f.dimCode as string) || undefined,
      operator: normalizeOperator((f.operator as string) || '='),
      values: (f.values as string[]) || [],
    })) as FilterRef[];
    const orders = ((dsl.orders as Array<Record<string, unknown>>) || []).map((o) => ({
      metricCode: (o.metricCode as string) || undefined,
      dimCode: (o.dimCode as string) || undefined,
      direction: ((o.direction as string) === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
    })) as OrderRef[];
    const limitValue = typeof dsl.limitValue === 'number' ? dsl.limitValue : 1000;

    return {
      chartType: chartType as ChartType,
      metrics,
      dimensions,
      filters,
      orders,
      limitValue,
    };
  } catch {
    return null;
  }
}

/**
 * 从 DSL 构建取数逻辑卡片数据
 */
function buildQueryLogic(dsl: MetricBiAnalysisCmd): QueryLogic {
  return {
    metrics: dsl.metrics.map((m) => ({
      label: m.metricName || m.alias || m.metricCode,
      value: m.metricCode,
    })),
    dimensions: dsl.dimensions.map((d) => ({
      label: d.dimName || d.alias || d.dimCode,
      value: d.dimCode,
    })),
    filters: dsl.filters.map((f) => ({
      label: f.dimCode || f.metricCode || '未知字段',
      value: `${f.dimCode || f.metricCode} ${f.operator} ${f.values.join(', ')}`,
    })),
    orders: dsl.orders.map((o) => ({
      label: o.dimCode || o.metricCode || '未知字段',
      value: `${o.direction}`,
    })),
    limit: dsl.limitValue,
  };
}

// ==================== Zustand Store ====================

export interface ChatBIState {
  conversations: Conversation[];
  activeConversationId: string;
  isLoading: boolean;
  inputValue: string;

  // derived
  messages: ChatMessage[];
  conversationId: string; // Dify conversationId

  // actions
  setInputValue: (value: string) => void;
  sendMessage: (query: string) => Promise<void>;
  newConversation: () => void;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  resetChat: () => void;
}

function getActiveConversation(state: ChatBIState): Conversation | undefined {
  return state.conversations.find((c) => c.id === state.activeConversationId);
}

export const useChatBIStore = create<ChatBIState>((set, get) => ({
  conversations: loadConversations(),
  activeConversationId: loadActiveId(),
  isLoading: false,
  inputValue: '',

  // derived
  messages: (() => {
    const convs = loadConversations();
    const activeId = loadActiveId();
    const active = convs.find((c) => c.id === activeId);
    return active ? active.messages.filter((m) => !m.loading) : [];
  })(),
  conversationId: (() => {
    const convs = loadConversations();
    const activeId = loadActiveId();
    const active = convs.find((c) => c.id === activeId);
    return active ? active.conversationId : '';
  })(),

  setInputValue: (value: string) => set({ inputValue: value }),

  newConversation: () => {
    const newConv: Conversation = {
      id: generateId(),
      title: '新对话',
      conversationId: '',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => {
      const newConvs = [newConv, ...state.conversations];
      saveConversations(newConvs);
      saveActiveId(newConv.id);
      return {
        conversations: newConvs,
        activeConversationId: newConv.id,
        messages: [],
        conversationId: '',
        isLoading: false,
        inputValue: '',
      };
    });
  },

  switchConversation: (id: string) => {
    set((state) => {
      const conv = state.conversations.find((c) => c.id === id);
      if (!conv) return state;
      saveActiveId(id);
      return {
        activeConversationId: id,
        messages: conv.messages.filter((m) => !m.loading),
        conversationId: conv.conversationId,
        isLoading: false,
        inputValue: '',
      };
    });
  },

  deleteConversation: (id: string) => {
    set((state) => {
      const newConvs = state.conversations.filter((c) => c.id !== id);
      saveConversations(newConvs);

      // 如果删除的是当前激活的对话，切换到最新的对话或创建新对话
      if (id === state.activeConversationId) {
        if (newConvs.length > 0) {
          const nextConv = newConvs[0];
          saveActiveId(nextConv.id);
          return {
            conversations: newConvs,
            activeConversationId: nextConv.id,
            messages: nextConv.messages.filter((m) => !m.loading),
            conversationId: nextConv.conversationId,
          };
        } else {
          const newConv: Conversation = {
            id: generateId(),
            title: '新对话',
            conversationId: '',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          const finalConvs = [newConv];
          saveConversations(finalConvs);
          saveActiveId(newConv.id);
          return {
            conversations: finalConvs,
            activeConversationId: newConv.id,
            messages: [],
            conversationId: '',
          };
        }
      }
      return { conversations: newConvs };
    });
  },

  resetChat: () => {
    get().newConversation();
  },

  sendMessage: async (query: string) => {
    const state = get();
    if (state.isLoading || !query.trim()) return;

    const activeConvId = state.activeConversationId;

    // 如果没有激活对话，自动创建
    if (!activeConvId) {
      get().newConversation();
    }

    const convId = get().activeConversationId;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: query.trim(),
    };

    // 添加 AI 占位消息（loading）
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      loading: true,
    };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isLoading: true,
      inputValue: '',
    }));

    let fullContent = '';
    let newDifyConversationId = state.conversationId;

    try {
      const stream = streamChatMessage({
        query: query.trim(),
        conversationId: state.conversationId,
        user: getCurrentUser(),
      });

      for await (const event of stream) {
        if (event.conversation_id && !newDifyConversationId) {
          newDifyConversationId = event.conversation_id;
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

      // message_end 后处理 DSL
      const rawDsl = parseDslFromContent(fullContent);
      const dsl = rawDsl ? normalizeDsl(rawDsl as unknown as Record<string, unknown>) : null;
      const cleanText = cleanContent(fullContent);

      if (dsl) {
        const [execRes, sqlRes] = await Promise.all([
          metricBiApi.execute(dsl),
          metricBiApi.previewSql(dsl),
        ]);

        const chartData = execRes.data;
        const sql = sqlRes.data;

        set((s) => {
          const msgs = [...s.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = cleanText || lastMsg.content;
            lastMsg.loading = false;
            lastMsg.dsl = dsl;
            lastMsg.chartData = chartData;
            lastMsg.chartType = dsl.chartType;
            lastMsg.sql = sql;
            lastMsg.queryLogic = buildQueryLogic(dsl);
            lastMsg.saveable = chartData?.status === 'SUCCESS';
          }
          return {
            messages: msgs,
            conversationId: newDifyConversationId,
            isLoading: false,
          };
        });
      } else {
        set((s) => {
          const msgs = [...s.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = cleanText || lastMsg.content;
            lastMsg.loading = false;
          }
          return {
            messages: msgs,
            conversationId: newDifyConversationId,
            isLoading: false,
          };
        });
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
        return { messages: msgs, isLoading: false };
      });
    }

    // 消息完成后持久化到 localStorage
    const finalState = get();
    const finalMsgs = finalState.messages.filter((m) => !m.loading);
    set((s) => {
      const newConvs = s.conversations.map((c) => {
        if (c.id === convId) {
          return {
            ...c,
            title: extractTitle(finalMsgs),
            conversationId: finalState.conversationId,
            messages: finalMsgs,
            updatedAt: Date.now(),
          };
        }
        return c;
      });

      // 如果对话不存在（例如首次发消息时自动创建的情况），添加新的
      if (!newConvs.find((c) => c.id === convId)) {
        newConvs.unshift({
          id: convId,
          title: extractTitle(finalMsgs),
          conversationId: finalState.conversationId,
          messages: finalMsgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      saveConversations(newConvs);
      saveActiveId(convId);
      return {
        conversations: newConvs,
        activeConversationId: convId,
      };
    });
  },
}));